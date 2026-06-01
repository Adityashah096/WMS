import { ForbiddenException, Injectable } from '@nestjs/common';
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
    condition: 'NEW' | 'OPEN',
    userId: number,
    locationId: number,
    destinationLocationId?: number,
  ) {
    console.log(`Scan: ${serial} | Action: ${action} | Location: ${locationId}`);

    // STEP 1 — FIND SERIES
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
      console.log(`Silent reject: ${serial}`);
      return { success: false, message: 'Unknown series — scan ignored', silent: true };
    }

    const series = seriesRes[0];

    // STEP 2 — COLOR EXTRACTION
    let color = null;
    if (series.has_color) {
      const colorCode = serial.slice(-2);
      const colorRes = await this.dataSource.query(
        `SELECT color_name FROM color_codes WHERE code = $1`,
        [colorCode]
      );
      if (colorRes.length > 0) {
        color = colorRes[0].color_name;
      } else {
        return { success: false, message: `Invalid color code: ${colorCode}` };
      }
    }

    // STEP 3 — GET LOCATION NAME
    const locationRes = await this.dataSource.query(
      `SELECT location_name FROM locations WHERE location_id = $1`,
      [locationId]
    );
    const locationName = locationRes[0]?.location_name || 'Unknown';

    // STEP 4 — MAP ACTION TO STATUS
    const locationCodeMap: Record<number, string> = {
      1: 'AT_AAJ',
      2: 'AT_PALAI',
      3: 'AT_REPAIR',
      4: 'AT_TAKSHASHELA',
    };

    let newStatus: string;
    let scanResult: string;

    if (action === 'OUT') {
      newStatus = 'IN_TRANSIT';
      scanResult = 'DISPATCHED';
      if (!destinationLocationId) {
        return { success: false, message: 'Destination location is required for OUT scan' };
      }
    } else {
      newStatus = locationCodeMap[locationId] || 'AT_AAJ';
      scanResult = 'RECEIVED';
    }

    // STEP 5 — CHECK IF ROBOT EXISTS
    const robotCheck = await this.dataSource.query(
      `SELECT * FROM robots WHERE serial_number = $1`,
      [serial]
    );

    if (robotCheck.length === 0) {
      await this.dataSource.query(
        `INSERT INTO robots 
         (serial_number, prefix, series_id, current_status, 
          current_location_id, color, condition,
          first_scanned_at, first_scanned_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)`,
        [serial, series.prefix, series.series_id, newStatus, locationId, color, condition, userId]
      );
      console.log(`New robot created: ${serial}`);
    } else {
      await this.dataSource.query(
        `UPDATE robots 
         SET current_status = $1, current_location_id = $2, condition = $3
         WHERE serial_number = $4`,
        [newStatus, locationId, condition, serial]
      );
    }

    // STEP 6 — CREATE/COMPLETE TRANSFER
    if (action === 'OUT' && destinationLocationId) {
      const slaRes = await this.dataSource.query(
        `SELECT expected_hours FROM route_sla 
         WHERE from_location_id = $1 AND to_location_id = $2`,
        [locationId, destinationLocationId]
      );
      const expectedHours = slaRes[0]?.expected_hours || 8;
      const expectedArrival = new Date();
      expectedArrival.setHours(expectedArrival.getHours() + expectedHours);

      await this.dataSource.query(
        `INSERT INTO transfers
         (serial_number, from_location_id, to_location_id,
          status, dispatched_at, dispatched_by, expected_arrival_at)
         VALUES ($1, $2, $3, $4, NOW(), $5, $6)`,
        [serial, locationId, destinationLocationId, 'DISPATCHED', userId, expectedArrival]
      );
    }

    if (action === 'IN') {
      await this.dataSource.query(
        `UPDATE transfers
         SET status = 'COMPLETED', received_at = NOW(), received_by = $1
         WHERE serial_number = $2 AND status = 'DISPATCHED'`,
        [userId, serial]
      );
    }

    // STEP 7 — INSERT SCAN EVENT
    await this.dataSource.query(
      `INSERT INTO scan_events 
       (raw_scan_data, serial_number, scanned_by, scanned_at_location, scan_result)
       VALUES ($1, $2, $3, $4, $5)`,
      [serial, serial, userId, locationId, scanResult]
    );

    // STEP 8 — AUDIT LOG
    await this.dataSource.query(
      `INSERT INTO audit_logs (action, serial_number, user_id, location_id, new_value)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        scanResult, serial, userId, locationId,
        JSON.stringify({ serial, action, color, condition, series: series.type_name, location: locationName, destination: destinationLocationId || null }),
      ]
    );

    return {
      success: true,
      message: 'Scan processed successfully',
      data: {
        serial,
        series: series.type_name,
        color: color ?? 'N/A',
        condition,
        action,
        status: newStatus,
        location: locationName,
        timestamp: new Date(),
      },
    };
  }

  // ============================
  // GET ALL SCAN EVENTS
  // ============================
  async getAllScans(locationId?: number) {
    const query = `
      SELECT 
        se.scan_id,
        se.serial_number,
        se.scan_result,
        se.scanned_at,
        u.name AS scanned_by_name,
        l.location_name AS location,
        r.color,
        r.condition,
        rs.type_name AS robot_type
      FROM scan_events se
      LEFT JOIN users u ON u.user_id = se.scanned_by
      LEFT JOIN locations l ON l.location_id = se.scanned_at_location
      LEFT JOIN robots r ON r.serial_number = se.serial_number
      LEFT JOIN robot_series rs ON rs.series_id = r.series_id
      ${locationId ? 'WHERE se.scanned_at_location = $1' : ''}
      ORDER BY se.scanned_at DESC
    `;
    return locationId
      ? await this.dataSource.query(query, [locationId])
      : await this.dataSource.query(query);
  }

  // ============================
  // GET OTHER LOCATIONS (for OUT dropdown)
  // ============================
  async getOtherLocations(currentLocationId: number) {
    return await this.dataSource.query(
      `SELECT location_id, location_name, location_code 
       FROM locations 
       WHERE location_id != $1 AND is_active = true
       ORDER BY location_name`,
      [currentLocationId]
    );
  }

  // ============================
  // GET DASHBOARD STATS
  // ============================
  async getDashboardStats(locationId?: number) {
    // For a specific location: "at this location" excludes in-transit robots (they've left).
    // For admin (no locationId): total_stock should include ALL robots everywhere,
    // including those currently in transit, so the grand total is always accurate.
    const locationFilter = locationId
      ? `WHERE r.current_location_id = ${locationId} AND r.current_status <> 'IN_TRANSIT'`
      : `WHERE r.current_status <> 'IN_TRANSIT'`;

    // Admin breakdown filters also include in-transit robots so counts add up to grand total.
    const typeFilter = locationId
      ? `WHERE r.current_location_id = ${locationId} AND r.current_status <> 'IN_TRANSIT'`
      : ``;  // no filter: count all robots
    const colorFilter = locationId
      ? `WHERE r.current_location_id = ${locationId} AND r.current_status <> 'IN_TRANSIT'`
      : ``;
    const conditionFilter = locationId
      ? `WHERE r.current_location_id = ${locationId} AND r.current_status <> 'IN_TRANSIT'`
      : ``;

    const transitFilter = locationId
      ? `WHERE t.from_location_id = ${locationId} AND t.status = 'DISPATCHED'`
      : `WHERE t.status = 'DISPATCHED'`;
    const incomingFilter = locationId
      ? `WHERE t.to_location_id = ${locationId} AND t.status = 'DISPATCHED'`
      : `WHERE t.status = 'DISPATCHED'`;

    // For admin: count ALL robots (no status filter) so in-transit are included in the grand total.
    const totalStockQuery = locationId
      ? `SELECT COUNT(*) as total FROM robots r ${locationFilter}`
      : `SELECT COUNT(*) as total FROM robots r`;
    const totalStock = await this.dataSource.query(totalStockQuery);

    const stockByType = await this.dataSource.query(
      `SELECT rs.type_name, COUNT(*) as count FROM robots r
       JOIN robot_series rs ON rs.series_id = r.series_id
       ${typeFilter} GROUP BY rs.type_name`
    );
    const stockByColor = await this.dataSource.query(
      `SELECT color, COUNT(*) as count FROM robots r ${colorFilter} GROUP BY color`
    );
    const stockByCondition = await this.dataSource.query(
      `SELECT condition, COUNT(*) as count FROM robots r ${conditionFilter} GROUP BY condition`
    );
    const inTransit = await this.dataSource.query(
      `SELECT COUNT(DISTINCT t.serial_number) as total FROM transfers t ${transitFilter}`
    );
    const incoming = await this.dataSource.query(
      `SELECT COUNT(DISTINCT t.serial_number) as total FROM transfers t ${incomingFilter}`
    );

    return {
      total_stock: parseInt(totalStock[0].total),
      in_transit: parseInt(inTransit[0].total),
      incoming: parseInt(incoming[0].total),
      by_type: stockByType,
      by_color: stockByColor,
      by_condition: stockByCondition,
    };
  }

  // ============================
  // EXCEL EXPORT DATA
  // ============================
  async getExportData(locationId?: number) {
    if (!locationId) {
      return await this.dataSource.query(
        `SELECT 
          r.serial_number,
          rs.type_name AS product,
          r.color,
          r.condition,
          r.current_status,
          l.location_name AS current_location,
          r.first_scanned_at,
          u.name AS first_scanned_by
         FROM robots r
         JOIN robot_series rs ON rs.series_id = r.series_id
         LEFT JOIN locations l ON l.location_id = r.current_location_id
         LEFT JOIN users u ON u.user_id = r.first_scanned_by
         ORDER BY rs.type_name, r.color, r.serial_number`
      );
    }

    return await this.dataSource.query(
      `SELECT *
       FROM (
         SELECT
           r.serial_number,
           rs.type_name AS product,
           r.color,
           r.condition,
           r.current_status::text AS current_status,
           l.location_name AS current_location,
           r.first_scanned_at,
           u.name AS first_scanned_by
         FROM robots r
         JOIN robot_series rs ON rs.series_id = r.series_id
         LEFT JOIN locations l ON l.location_id = r.current_location_id
         LEFT JOIN users u ON u.user_id = r.first_scanned_by
         WHERE r.current_location_id = $1
           AND r.current_status <> 'IN_TRANSIT'

         UNION ALL

         SELECT
           r.serial_number,
           rs.type_name AS product,
           r.color,
           r.condition,
           'IN_TRANSIT' AS current_status,
           from_location.location_name AS current_location,
           r.first_scanned_at,
           u.name AS first_scanned_by
         FROM (
           SELECT DISTINCT ON (t.serial_number)
             t.serial_number,
             t.from_location_id
           FROM transfers t
           WHERE t.from_location_id = $1
             AND t.status = 'DISPATCHED'
           ORDER BY t.serial_number, t.dispatched_at DESC
         ) active_transit
         JOIN robots r ON r.serial_number = active_transit.serial_number
         JOIN robot_series rs ON rs.series_id = r.series_id
         LEFT JOIN locations from_location ON from_location.location_id = active_transit.from_location_id
         LEFT JOIN users u ON u.user_id = r.first_scanned_by

         UNION ALL

         SELECT
           r.serial_number,
           rs.type_name AS product,
           r.color,
           r.condition,
           'INCOMING' AS current_status,
           to_location.location_name AS current_location,
           r.first_scanned_at,
           u.name AS first_scanned_by
         FROM (
           SELECT DISTINCT ON (t.serial_number)
             t.serial_number,
             t.to_location_id
           FROM transfers t
           WHERE t.to_location_id = $1
             AND t.status = 'DISPATCHED'
           ORDER BY t.serial_number, t.dispatched_at DESC
         ) active_incoming
         JOIN robots r ON r.serial_number = active_incoming.serial_number
         JOIN robot_series rs ON rs.series_id = r.series_id
         LEFT JOIN locations to_location ON to_location.location_id = active_incoming.to_location_id
         LEFT JOIN users u ON u.user_id = r.first_scanned_by
       ) inventory_rows
       ORDER BY product, color, serial_number`,
      [locationId]
    );
  }

  // ============================
  // GET ROBOT JOURNEY/HISTORY
  // ============================
  async getRobotHistory(serial: string, locationId?: number) {
    const robotRes = await this.dataSource.query(
      `SELECT 
        r.serial_number, r.color, r.condition, r.current_status, r.current_location_id,
        r.first_scanned_at, rs.type_name AS product,
        l.location_name AS current_location
       FROM robots r
       JOIN robot_series rs ON rs.series_id = r.series_id
       LEFT JOIN locations l ON l.location_id = r.current_location_id
       WHERE r.serial_number = $1`,
      [serial]
    );

    if (robotRes.length === 0) {
      return { found: false, message: 'Robot not found' };
    }

    if (locationId && Number(robotRes[0].current_location_id) !== Number(locationId)) {
      const activeTransferRes = await this.dataSource.query(
        `SELECT 1
         FROM transfers t
         WHERE t.serial_number = $1
           AND t.status = 'DISPATCHED'
           AND (t.from_location_id = $2 OR t.to_location_id = $2)
         LIMIT 1`,
        [serial, locationId]
      );

      if (activeTransferRes.length === 0) {
        throw new ForbiddenException('You can only access robots from your assigned location');
      }
    }

    // FIX: Join transfers to scan_events precisely by matching the transfer whose
    // dispatched_at timestamp is within a 5-second window of the scan event.
    // The old join used ::date which matched ANY transfer on the same calendar day,
    // causing duplicate ghost rows when multiple OUT scans happened on the same day.
    const historyRes = await this.dataSource.query(
      `SELECT 
        se.scan_result,
        se.scanned_at,
        l.location_name AS location,
        u.name AS scanned_by,
        tl.location_name AS destination
       FROM scan_events se
       LEFT JOIN locations l ON l.location_id = se.scanned_at_location
       LEFT JOIN users u ON u.user_id = se.scanned_by
       LEFT JOIN LATERAL (
         -- For each DISPATCHED scan event, find the one transfer that was created
         -- within a tight 5-second window around the scan timestamp.
         -- This prevents multiple same-day OUT scans from cross-joining each other.
         SELECT t.to_location_id
         FROM transfers t
         WHERE t.serial_number = se.serial_number
           AND se.scan_result = 'DISPATCHED'
           AND t.dispatched_at BETWEEN se.scanned_at - INTERVAL '5 seconds'
                                   AND se.scanned_at + INTERVAL '5 seconds'
         ORDER BY ABS(EXTRACT(EPOCH FROM (t.dispatched_at - se.scanned_at)))
         LIMIT 1
       ) matched_transfer ON true
       LEFT JOIN locations tl ON tl.location_id = matched_transfer.to_location_id
       WHERE se.serial_number = $1
       ORDER BY se.scanned_at ASC`,
      [serial]
    );

    const { current_location_id, ...robot } = robotRes[0];
    return { found: true, robot, history: historyRes };
  }

  // ============================
  // VALIDATE SCAN BEFORE PROCESSING
  // ============================
  async validateScan(serial: string, action: 'IN' | 'OUT', locationId: number) {
    // Check if series is valid
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
      return { valid: false, message: '⚠️ Unknown robot series — this serial is not recognized' };
    }

    // Check if robot exists
    const robotRes = await this.dataSource.query(
      `SELECT 
         r.serial_number, r.current_status, r.current_location_id,
         l.location_name AS current_location, rs.type_name AS product
       FROM robots r
       LEFT JOIN locations l ON l.location_id = r.current_location_id
       LEFT JOIN robot_series rs ON rs.series_id = r.series_id
       WHERE r.serial_number = $1`,
      [serial]
    );

    // First time scan
    if (robotRes.length === 0) {
      if (action === 'OUT') {
        return { valid: false, message: '⚠️ Robot not found. Cannot do OUT for an unregistered robot.' };
      }
      return { valid: true, message: '✅ New robot — will be registered on first scan', isNew: true };
    }

    const robot = robotRes[0];
    const currentStatus = robot.current_status;
    const currentLocation = robot.current_location;
    const currentLocationId = robot.current_location_id;

    const workerLocationRes = await this.dataSource.query(
      `SELECT location_name FROM locations WHERE location_id = $1`,
      [locationId]
    );
    const workerLocation = workerLocationRes[0]?.location_name || 'Unknown';

    // RULE 1: Robot AT location + IN scan attempted
    if (currentStatus !== 'IN_TRANSIT' && action === 'IN') {
      if (currentLocationId === locationId) {
        return {
          valid: false,
          message: `❌ Already in stock at ${currentLocation}. Cannot scan IN again at the same location.`,
        };
      } else {
        return {
          valid: false,
          message: `❌ Robot is currently at ${currentLocation}. It must be scanned OUT from ${currentLocation} before receiving here.`,
        };
      }
    }

    // RULE 2: Robot IN_TRANSIT + OUT attempted
    if (currentStatus === 'IN_TRANSIT' && action === 'OUT') {
      return {
        valid: false,
        message: `❌ Robot is already in transit. Cannot dispatch again until received at destination.`,
      };
    }

    // RULE 3: Robot IN_TRANSIT + IN at wrong location
    if (currentStatus === 'IN_TRANSIT' && action === 'IN') {
      const transferRes = await this.dataSource.query(
        `SELECT t.to_location_id, l.location_name AS destination
         FROM transfers t
         JOIN locations l ON l.location_id = t.to_location_id
         WHERE t.serial_number = $1 AND t.status = 'DISPATCHED'
         ORDER BY t.dispatched_at DESC LIMIT 1`,
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

    // RULE 4: Robot AT location + OUT from wrong location
    if (currentStatus !== 'IN_TRANSIT' && action === 'OUT') {
      if (currentLocationId !== locationId) {
        return {
          valid: false,
          message: `❌ Robot is at ${currentLocation}. Only ${currentLocation} can dispatch this robot.`,
        };
      }
    }

    // ALL GOOD
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