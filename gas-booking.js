/**
 * BEAT THE MIX - Booking System (Google Apps Script)
 *
 * === SETUP ===
 * 1. Google Spreadsheet to create with 3 sheets:
 *
 *    Sheet "スケジュール" (columns):
 *    | date       | studio      | time          | class_name  | max |
 *    | 2026/03/22 | 若葉studio  | 16:00〜17:00   | KIDSクラス   | 8   |
 *
 *    Sheet "予約" (columns):
 *    | date       | studio      | time          | class_name  | name     | phone          | email              | booked_at        |
 *    | 2026/03/22 | 若葉studio  | 16:00〜17:00   | KIDSクラス   | 田中太郎 | 090-1234-5678  | tanaka@example.com | 2026/03/18 10:30 |
 *
 *    Sheet "お知らせ" (columns):
 *    | 日付       | タイトル               | 内容                  | 重要度 |
 *    | 2026/03/18 | 春の体験レッスン開催！   | 3月20日〜4月10日...    | 重要   |
 *
 * 2. Extensions > Apps Script > paste this code
 * 3. Deploy > New deployment > Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4. Copy the deployment URL into members-page.html APPS_SCRIPT_URL
 * 5. Set DEMO_MODE = false in members-page.html
 *
 * === API ENDPOINTS ===
 * GET ?action=slots              → Returns all lesson slots with availability + members
 * GET ?action=book&date=...&...  → Creates a booking
 */

function doGet(e) {
  var action = (e.parameter.action || '').toLowerCase();
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  try {
    switch (action) {
      case 'slots':
        return getSlots(ss);
      case 'book':
        return createBooking(ss, e.parameter);
      default:
        return jsonResponse({ error: 'Unknown action: ' + action });
    }
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

// ===== GET SLOTS =====
// Returns all slots with booked count, availability, and member list
function getSlots(ss) {
  var schedSheet = ss.getSheetByName('スケジュール');
  if (!schedSheet) return jsonResponse([]);

  var schedData = schedSheet.getDataRange().getValues();
  if (schedData.length <= 1) return jsonResponse([]);

  // Load all bookings
  var bookingSheet = ss.getSheetByName('予約');
  var bookingMap = {}; // key -> [{name, booked_at}]

  if (bookingSheet && bookingSheet.getLastRow() > 1) {
    var bookData = bookingSheet.getDataRange().getValues();
    for (var i = 1; i < bookData.length; i++) {
      var bDate = formatDate(bookData[i][0]);
      var bKey = bDate + '|' + bookData[i][1] + '|' + bookData[i][2];
      if (!bookingMap[bKey]) bookingMap[bKey] = [];
      bookingMap[bKey].push({
        name: String(bookData[i][4] || ''),
        booked_at: String(bookData[i][7] || '')
      });
    }
  }

  // Build slot list
  var slots = [];
  for (var i = 1; i < schedData.length; i++) {
    var row = schedData[i];
    if (!row[0]) continue; // skip empty rows

    var dateStr = formatDate(row[0]);
    var studio = String(row[1] || '');
    var time = String(row[2] || '');
    var className = String(row[3] || '');
    var max = parseInt(row[4]) || 10;
    var key = dateStr + '|' + studio + '|' + time;
    var members = bookingMap[key] || [];
    var booked = members.length;

    slots.push({
      date: dateStr,
      studio: studio,
      time: time,
      class_name: className,
      max: max,
      booked: booked,
      available: Math.max(0, max - booked),
      members: members
    });
  }

  return jsonResponse(slots);
}

// ===== CREATE BOOKING =====
function createBooking(ss, params) {
  // Validate required fields
  if (!params.name || !params.date || !params.studio || !params.time) {
    return jsonResponse({ success: false, error: '必須項目が不足しています' });
  }

  // Ensure 予約 sheet exists
  var sheet = ss.getSheetByName('予約');
  if (!sheet) {
    sheet = ss.insertSheet('予約');
    sheet.appendRow(['date', 'studio', 'time', 'class_name', 'name', 'phone', 'email', 'booked_at']);
  }

  // Check capacity
  var schedSheet = ss.getSheetByName('スケジュール');
  if (schedSheet) {
    var schedData = schedSheet.getDataRange().getValues();
    var maxCapacity = 10;
    for (var i = 1; i < schedData.length; i++) {
      if (formatDate(schedData[i][0]) === params.date &&
          String(schedData[i][1]) === params.studio &&
          String(schedData[i][2]) === params.time) {
        maxCapacity = parseInt(schedData[i][4]) || 10;
        break;
      }
    }

    // Count existing bookings for this slot
    var bookData = sheet.getDataRange().getValues();
    var count = 0;
    for (var i = 1; i < bookData.length; i++) {
      if (String(bookData[i][0]) === params.date &&
          String(bookData[i][1]) === params.studio &&
          String(bookData[i][2]) === params.time) {
        count++;
      }
    }

    if (count >= maxCapacity) {
      return jsonResponse({ success: false, error: 'このレッスンは満員です' });
    }

    // Duplicate check (same name + same slot)
    for (var i = 1; i < bookData.length; i++) {
      if (String(bookData[i][0]) === params.date &&
          String(bookData[i][1]) === params.studio &&
          String(bookData[i][2]) === params.time &&
          String(bookData[i][4]) === params.name) {
        return jsonResponse({ success: false, error: 'すでに予約済みです' });
      }
    }
  }

  // Write booking
  var now = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'MM/dd HH:mm');
  sheet.appendRow([
    params.date,
    params.studio,
    params.time,
    params.class_name || '',
    params.name,
    params.phone || '',
    params.email || '',
    now
  ]);

  return jsonResponse({ success: true });
}

// ===== UTILITIES =====
function formatDate(val) {
  if (val instanceof Date) {
    var y = val.getFullYear();
    var m = ('0' + (val.getMonth() + 1)).slice(-2);
    var d = ('0' + val.getDate()).slice(-2);
    return y + '/' + m + '/' + d;
  }
  return String(val || '');
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
