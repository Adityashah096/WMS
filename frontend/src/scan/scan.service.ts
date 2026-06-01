import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class ScanService {
  constructor(
    @InjectDataSource() private dataSource: DataSource,
  ) {}

  // ============================
  // CORE SCAN LOGIC
  // ============================
  async processScan(
    serial: string,
    action: 'IN' | 'OUT',
    userId: number,
    locationId: number,
  ) {
    console.log(`Scan received: ${serial} | Action: ${action}`);

    // ============================
    // STEP 1 — FIND SERIES
    // ============================
    const seriesRes = await this.dataSource.query(
      `SELECT * FROM robot_series
       WHERE 
         (match_type = 'STARTS_WITH' AND $1 LIKE match_pattern || '%')
         OR
         (match_type = 'CONTAINS' AND $1 LIKE '%' || match_pattern || '%')
       LIMIT 1`,
      [serial]
    );

    // SILENT REJECT — unknown series
    if (seriesRes.length === 0) {
      console.log(`Silent reject: ${serial} — unknown series`);
      return {
        success: false,
        message: 'Unknown series — scan ignored',
        silent: true,
      };
    }

    const series = seriesRes[0];

    // ============================
    // STEP 2 — COLOR EXTRACTION
    // ============================
    let color = null;

    if (series.has_color) {
      const colorCode = serial.slice(-2); // last 2 chars e.g. "_B"

      const colorRes = await this.dataSource.query(
        `SELECT color_name FROM color_codes WHERE code = $1`,
        [colorCode]
      );

      if (colorRes.length > 0) {
        color = colorRes[0].color_name;
      } else {
        return {
          success: false,
          message: `Invalid color code: ${colorCode}`,
        };
      }
    }

    // ============================
    // STEP 3 — MAP ACTION TO ENUM
    // ============================
    const scanResult = action === 'OUT' ? 'DISPATCHED' : 'RECEIVED';

    // ============================
    // STEP 4 — INSERT SCAN EVENT
    // ============================
    await this.dataSource.query(
      `INSERT INTO scan_events 
       (raw_scan_data, serial_number, scanned_by, scanned_at_location, scan_result)
       VALUES ($1, $2, $3, $4, $5)`,
      [serial, serial, userId, locationId, scanResult]
    );

    // ============================
    // STEP 5 — INSERT ROBOT IF NEW
    // ============================
    const robotCheck = await this.dataSource.query(
      `SELECT serial_number FROM robots WHERE serial_number = $1`,
      [serial]
    );

    if (robotCheck.length === 0) {
      // First time this robot is seen — auto create
      await this.dataSource.query(
        `INSERT INTO robots 
         (serial_number, prefix, series_id, current_status, current_location_id, color, first_scanned_at, first_scanned_by)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)`,
        [
          serial,
          series.prefix,
          series.series_id,
          'AT_AJJ',
          locationId,
          color,
          userId,
        ]
      );
      console.log(`New robot created: ${serial}`);
    }

    // ============================
    // STEP 6 — AUDIT LOG
    // ============================
    await this.dataSource.query(
      `INSERT INTO audit_logs (action, serial_number, user_id, location_id, new_value)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        scanResult,
        serial,
        userId,
        locationId,
        JSON.stringify({ serial, action, color, series: series.type_name }),
      ]
    );

    // ============================
    // SUCCESS
    // ============================
    return {
      success: true,
      message: 'Scan processed successfully',
      data: {
        serial,
        series: series.type_name,
        color: color ?? 'N/A',
        action,
        result: scanResult,
      },
    };
  }

  // ============================
  // GET ALL SCAN EVENTS
  // ============================
  async getAllScans(locationId?: number) {
    const query = locationId
      ? `SELECT 
           se.scan_id,
           se.serial_number,
           se.scan_result,
           se.scanned_at,
           u.name AS scanned_by_name,
           l.location_name AS location,
           r.color,
           rs.type_name AS robot_type
         FROM scan_events se
         LEFT JOIN users u ON u.user_id = se.scanned_by
         LEFT JOIN locations l ON l.location_id = se.scanned_at_location
         LEFT JOIN robots r ON r.serial_number = se.serial_number
         LEFT JOIN robot_series rs ON rs.series_id = r.series_id
         WHERE se.scanned_at_location = $1
         ORDER BY se.scanned_at DESC
         LIMIT 100`
      : `SELECT 
           se.scan_id,
           se.serial_number,
           se.scan_result,
           se.scanned_at,
           u.name AS scanned_by_name,
           l.location_name AS location,
           r.color,
           rs.type_name AS robot_type
         FROM scan_events se
         LEFT JOIN users u ON u.user_id = se.scanned_by
         LEFT JOIN locations l ON l.location_id = se.scanned_at_location
         LEFT JOIN robots r ON r.serial_number = se.serial_number
         LEFT JOIN robot_series rs ON rs.series_id = r.series_id
         ORDER BY se.scanned_at DESC
         LIMIT 100`;

    const result = locationId
      ? await this.dataSource.query(query, [locationId])
      : await this.dataSource.query(query);

    return result;
  }

  // ============================
  // VALIDATE SCAN BEFORE PROCESSING
  // ============================
  async validateScan(
    serial: string,
    action: 'IN' | 'OUT',
    locationId: number,
  ) {
    // Check if series is valid first
    const seriesRes = await this.dataSource.query(
      `SELECT * FROM robot_series
       WHERE 
         (match_type = 'STARTS_WITH' AND $1 LIKE match_pattern || '%')
         OR
         (match_type = 'CONTAINS' AND $1 LIKE '%' || match_pattern || '%')
       LIMIT 1`,
      [serial]
    );

    if (seriesRes.length === 0) {
      return {
        valid: false,
        message: 'Unknown robot series — this serial is not recognized',
      };
    }

    // Check if robot exists in database
    const robotRes = await this.dataSource.query(
      `SELECT 
         r.serial_number,
         r.current_status,
         r.current_location_id,
         l.location_name AS current_location,
         rs.type_name AS product
       FROM robots r
       LEFT JOIN locations l ON l.location_id = r.current_location_id
       LEFT JOIN robot_series rs ON rs.series_id = r.series_id
       WHERE r.serial_number = $1`,
      [serial]
    );

    // Robot not seen before — first time scan
    if (robotRes.length === 0) {
      if (action === 'OUT') {
        return {
          valid: false,
          message: 'Robot not found in system. Cannot do OUT for unknown robot.',
        };
      }
      return {
        valid: true,
        message: 'New robot — will be registered on first scan',
        isNew: true,
      };
    }

    const robot = robotRes[0];
    const currentStatus = robot.current_status;
    const currentLocation = robot.current_location;
    const currentLocationId = robot.current_location_id;

    // Get current location name for this worker
    const workerLocationRes = await this.dataSource.query(
      `SELECT location_name FROM locations WHERE location_id = $1`,
      [locationId]
    );
    const workerLocation = workerLocationRes[0]?.location_name || 'Unknown';

    // ============================
    // VALIDATION RULES
    // ============================

    // RULE 1: Robot AT a location + worker tries IN
    if (currentStatus !== 'IN_TRANSIT' && action === 'IN') {
      if (currentLocationId === locationId) {
        // Same location IN scan
        return {
          valid: false,
          message: `❌ Already in stock at ${currentLocation}. Cannot scan IN again at the same location.`,
        };
      } else {
        // Different location IN scan without OUT first
        return {
          valid: false,
          message: `❌ Robot is currently at ${currentLocation}. It must be scanned OUT from ${currentLocation} before you can receive it here.`,
        };
      }
    }

    // RULE 2: Robot IN_TRANSIT + worker tries OUT
    if (currentStatus === 'IN_TRANSIT' && action === 'OUT') {
      return {
        valid: false,
        message: `❌ Robot is already in transit. Cannot dispatch again until it is received at destination.`,
      };
    }

    // RULE 3: Robot IN_TRANSIT + worker tries IN at wrong location
    if (currentStatus === 'IN_TRANSIT' && action === 'IN') {
      // Check what location it is heading to
      const transferRes = await this.dataSource.query(
        `SELECT 
           t.to_location_id,
           l.location_name AS destination
         FROM transfers t
         JOIN locations l ON l.location_id = t.to_location_id
         WHERE t.serial_number = $1 AND t.status = 'DISPATCHED'
         ORDER BY t.dispatched_at DESC
         LIMIT 1`,
        [serial]
      );

      if (transferRes.length > 0) {
        const destinationId = transferRes[0].to_location_id;
        const destination = transferRes[0].destination;

        if (destinationId !== locationId) {
          return {
            valid: false,
            message: `❌ This robot is in transit to ${destination}. You cannot receive it at ${workerLocation}.`,
          };
        }
      }
    }

    // RULE 4: Robot AT location + worker tries OUT from different location
    if (currentStatus !== 'IN_TRANSIT' && action === 'OUT') {
      if (currentLocationId !== locationId) {
        return {
          valid: false,
          message: `❌ Robot is currently at ${currentLocation}. Only ${currentLocation} can dispatch this robot.`,
        };
      }
    }

    // ALL CHECKS PASSED
    return {
      valid: true,
      message: '✅ Scan is valid',
      robot: {
        serial: robot.serial_number,
        product: robot.product,
        current_status: currentStatus,
        current_location: currentLocation,
      },
    };
  }
}
