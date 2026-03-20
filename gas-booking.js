/**
 * BEAT THE MIX - Booking System (Google Apps Script)
 *
 * === SETUP ===
 * 1. Google Spreadsheet to create with 3 sheets:
 *
 *    Sheet "スケジュール" (columns):
 *    | date       | studio      | time          | class_name  | max | category |
 *    | 2026/03/22 | 若葉studio  | 16:00〜17:00   | KIDSクラス   | 8   | KIDS     |
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
 * GET ?action=slots                          → All lesson slots with availability + members
 * GET ?action=book&date=...&...              → Create a booking
 * GET ?action=announcements                  → All announcements (with row numbers)
 * GET ?action=addSlot&adminKey=...&...       → Add a lesson slot (admin)
 * GET ?action=deleteSlot&adminKey=...&...    → Delete a lesson slot (admin)
 * GET ?action=addAnnouncement&adminKey=...   → Add an announcement (admin)
 * GET ?action=deleteAnnouncement&adminKey=...→ Delete an announcement (admin)
 * GET ?action=cancelBooking&adminKey=...     → Cancel a booking (admin)
 */

var ADMIN_KEY = 'btmadmin2026';

function doGet(e) {
  var action = (e.parameter.action || '').toLowerCase();
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  try {
    switch (action) {
      case 'slots':
        return getSlots(ss);
      case 'book':
        return createBooking(ss, e.parameter);
      case 'announcements':
        return getAnnouncements(ss);
      case 'addslot':
        validateAdmin(e.parameter);
        return addSlot(ss, e.parameter);
      case 'deleteslot':
        validateAdmin(e.parameter);
        return deleteSlot(ss, e.parameter);
      case 'addannouncement':
        validateAdmin(e.parameter);
        return addAnnouncement(ss, e.parameter);
      case 'deleteannouncement':
        validateAdmin(e.parameter);
        return deleteAnnouncement(ss, e.parameter);
      case 'cancelbooking':
        validateAdmin(e.parameter);
        return cancelBooking(ss, e.parameter);
      default:
        return jsonResponse({ error: 'Unknown action: ' + action });
    }
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

// ===== ADMIN VALIDATION =====
function validateAdmin(params) {
  if ((params.adminKey || '') !== ADMIN_KEY) {
    throw new Error('管理者権限がありません');
  }
}

// ===== GET SLOTS =====
function getSlots(ss) {
  var schedSheet = ss.getSheetByName('スケジュール');
  if (!schedSheet) return jsonResponse([]);

  var schedData = schedSheet.getDataRange().getValues();
  if (schedData.length <= 1) return jsonResponse([]);

  var bookingSheet = ss.getSheetByName('予約');
  var bookingMap = {};

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

  var slots = [];
  for (var i = 1; i < schedData.length; i++) {
    var row = schedData[i];
    if (!row[0]) continue;

    var dateStr = formatDate(row[0]);
    var studio = String(row[1] || '');
    var time = String(row[2] || '');
    var className = String(row[3] || '');
    var max = parseInt(row[4]) || 10;
    var category = String(row[5] || '');
    var key = dateStr + '|' + studio + '|' + time;
    var members = bookingMap[key] || [];
    var booked = members.length;

    slots.push({
      date: dateStr,
      studio: studio,
      time: time,
      class_name: className,
      max: max,
      category: category,
      booked: booked,
      available: Math.max(0, max - booked),
      members: members
    });
  }

  return jsonResponse(slots);
}

// ===== CREATE BOOKING =====
function createBooking(ss, params) {
  if (!params.name || !params.date || !params.studio || !params.time) {
    return jsonResponse({ success: false, error: '必須項目が不足しています' });
  }

  var sheet = ss.getSheetByName('予約');
  if (!sheet) {
    sheet = ss.insertSheet('予約');
    sheet.appendRow(['date', 'studio', 'time', 'class_name', 'name', 'phone', 'email', 'booked_at']);
  }

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

    for (var i = 1; i < bookData.length; i++) {
      if (String(bookData[i][0]) === params.date &&
          String(bookData[i][1]) === params.studio &&
          String(bookData[i][2]) === params.time &&
          String(bookData[i][4]) === params.name) {
        return jsonResponse({ success: false, error: 'すでに予約済みです' });
      }
    }
  }

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

// ===== GET ANNOUNCEMENTS (with row numbers for admin delete) =====
function getAnnouncements(ss) {
  var sheet = ss.getSheetByName('お知らせ');
  if (!sheet || sheet.getLastRow() <= 1) return jsonResponse([]);

  var data = sheet.getDataRange().getValues();
  var items = [];
  for (var i = 1; i < data.length; i++) {
    items.push({
      row: i + 1,
      date: formatDate(data[i][0]) || String(data[i][0] || ''),
      title: String(data[i][1] || ''),
      content: String(data[i][2] || ''),
      importance: String(data[i][3] || '')
    });
  }
  return jsonResponse(items);
}

// ===== ADMIN: ADD SLOT =====
function addSlot(ss, params) {
  if (!params.date || !params.studio || !params.time || !params.class_name) {
    return jsonResponse({ success: false, error: '必須項目が不足しています' });
  }

  var sheet = ss.getSheetByName('スケジュール');
  if (!sheet) {
    sheet = ss.insertSheet('スケジュール');
    sheet.appendRow(['date', 'studio', 'time', 'class_name', 'max', 'category']);
  }

  sheet.appendRow([
    params.date,
    params.studio,
    params.time,
    params.class_name,
    parseInt(params.max) || 10,
    params.category || ''
  ]);

  return jsonResponse({ success: true });
}

// ===== ADMIN: DELETE SLOT =====
function deleteSlot(ss, params) {
  if (!params.date || !params.studio || !params.time) {
    return jsonResponse({ success: false, error: '必須項目が不足しています' });
  }

  var sheet = ss.getSheetByName('スケジュール');
  if (!sheet) return jsonResponse({ success: false, error: 'シートが見つかりません' });

  var data = sheet.getDataRange().getValues();
  var deleted = 0;
  for (var i = data.length - 1; i >= 1; i--) {
    if (formatDate(data[i][0]) === params.date &&
        String(data[i][1]) === params.studio &&
        String(data[i][2]) === params.time) {
      sheet.deleteRow(i + 1);
      deleted++;
    }
  }

  return jsonResponse({ success: true, deleted: deleted });
}

// ===== ADMIN: ADD ANNOUNCEMENT =====
function addAnnouncement(ss, params) {
  if (!params.title) {
    return jsonResponse({ success: false, error: 'タイトルは必須です' });
  }

  var sheet = ss.getSheetByName('お知らせ');
  if (!sheet) {
    sheet = ss.insertSheet('お知らせ');
    sheet.appendRow(['日付', 'タイトル', '内容', '重要度']);
  }

  var date = params.date || Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd');
  sheet.appendRow([date, params.title, params.content || '', params.importance || '']);

  return jsonResponse({ success: true });
}

// ===== ADMIN: DELETE ANNOUNCEMENT =====
function deleteAnnouncement(ss, params) {
  var row = parseInt(params.row);
  if (!row || row < 2) {
    return jsonResponse({ success: false, error: '無効な行番号です' });
  }

  var sheet = ss.getSheetByName('お知らせ');
  if (!sheet) return jsonResponse({ success: false, error: 'シートが見つかりません' });

  if (row > sheet.getLastRow()) {
    return jsonResponse({ success: false, error: '該当する行がありません' });
  }

  sheet.deleteRow(row);
  return jsonResponse({ success: true });
}

// ===== ADMIN: CANCEL BOOKING =====
function cancelBooking(ss, params) {
  if (!params.date || !params.studio || !params.time || !params.name) {
    return jsonResponse({ success: false, error: '必須項目が不足しています' });
  }

  var sheet = ss.getSheetByName('予約');
  if (!sheet) return jsonResponse({ success: false, error: 'シートが見つかりません' });

  var data = sheet.getDataRange().getValues();
  for (var i = data.length - 1; i >= 1; i--) {
    if (formatDate(data[i][0]) === params.date &&
        String(data[i][1]) === params.studio &&
        String(data[i][2]) === params.time &&
        String(data[i][4]) === params.name) {
      sheet.deleteRow(i + 1);
      return jsonResponse({ success: true });
    }
  }

  return jsonResponse({ success: false, error: '該当する予約が見つかりません' });
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
