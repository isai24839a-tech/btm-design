/**
 * BEAT THE MIX — 予約システム (Google Apps Script)
 *
 * セットアップ手順:
 * 1. Google Spreadsheetを作成
 * 2. シート名「スケジュール」を作り、1行目に: 日付 | スタジオ | 時間 | クラス | 定員
 * 3. シート名「予約一覧」を作り、1行目に: 日付 | スタジオ | 時間 | クラス | お名前 | 電話番号 | 予約日時
 * 4. スプレッドシートの「拡張機能」→「Apps Script」を開く
 * 5. このファイルの内容を全てコピーしてエディタに貼り付け
 * 6. 「デプロイ」→「新しいデプロイ」→ 種類「ウェブアプリ」
 *    - 実行ユーザー: 自分
 *    - アクセス権: 全員
 * 7. 表示されたURLをコピーして、members-page.html の APPS_SCRIPT_URL に設定
 */

// ===== 設定 =====
var ADMIN_EMAIL = 'beat.the.mix7386@gmail.com'; // 通知先メールアドレス

function doGet(e) {
  var action = (e.parameter.action || '').toLowerCase();

  if (action === 'slots') {
    return getAvailableSlots();
  } else if (action === 'book') {
    return bookSlot(e.parameter);
  } else if (action === 'list') {
    return getBookingList();
  } else {
    return jsonResponse({ error: 'Unknown action' });
  }
}

/**
 * 空きレッスン一覧を返す
 */
function getAvailableSlots() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var scheduleSheet = ss.getSheetByName('スケジュール');
  var bookingSheet = ss.getSheetByName('予約一覧');

  if (!scheduleSheet || !bookingSheet) {
    return jsonResponse({ error: 'シートが見つかりません。「スケジュール」と「予約一覧」シートを作成してください。' });
  }

  // Get schedule data (skip header row)
  var scheduleData = scheduleSheet.getDataRange().getValues();
  if (scheduleData.length <= 1) {
    return jsonResponse([]);
  }

  // Count existing bookings per slot
  var bookingData = bookingSheet.getDataRange().getValues();
  var bookingCounts = {};

  for (var i = 1; i < bookingData.length; i++) {
    var row = bookingData[i];
    var key = formatDate(row[0]) + '|' + row[1] + '|' + row[2] + '|' + row[3];
    bookingCounts[key] = (bookingCounts[key] || 0) + 1;
  }

  // Build available slots
  var slots = [];
  var today = new Date();
  today.setHours(0, 0, 0, 0);

  for (var i = 1; i < scheduleData.length; i++) {
    var row = scheduleData[i];
    var date = row[0];
    var studio = row[1] || '';
    var time = row[2] || '';
    var className = row[3] || '';
    var maxCapacity = parseInt(row[4]) || 10;

    // Skip past dates
    if (date instanceof Date && date < today) continue;

    var dateStr = formatDate(date);
    var key = dateStr + '|' + studio + '|' + time + '|' + className;
    var booked = bookingCounts[key] || 0;
    var available = maxCapacity - booked;

    slots.push({
      date: dateStr,
      studio: String(studio),
      time: String(time),
      class_name: String(className),
      max: maxCapacity,
      booked: booked,
      available: Math.max(0, available)
    });
  }

  return jsonResponse(slots);
}

/**
 * 予約を登録する
 */
function bookSlot(params) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var bookingSheet = ss.getSheetByName('予約一覧');
  var scheduleSheet = ss.getSheetByName('スケジュール');

  if (!bookingSheet || !scheduleSheet) {
    return jsonResponse({ success: false, error: 'シートが見つかりません' });
  }

  var date = params.date || '';
  var studio = params.studio || '';
  var time = params.time || '';
  var className = params.class_name || '';
  var name = params.name || '';
  var phone = params.phone || '';

  if (!name) {
    return jsonResponse({ success: false, error: 'お名前を入力してください' });
  }

  // Check if slot still has availability
  var bookingData = bookingSheet.getDataRange().getValues();
  var key = date + '|' + studio + '|' + time + '|' + className;
  var currentBookings = 0;

  for (var i = 1; i < bookingData.length; i++) {
    var row = bookingData[i];
    var rowKey = formatDate(row[0]) + '|' + row[1] + '|' + row[2] + '|' + row[3];
    if (rowKey === key) currentBookings++;
  }

  // Find max capacity from schedule
  var scheduleData = scheduleSheet.getDataRange().getValues();
  var maxCapacity = 10;

  for (var i = 1; i < scheduleData.length; i++) {
    var row = scheduleData[i];
    var schedKey = formatDate(row[0]) + '|' + row[1] + '|' + row[2] + '|' + row[3];
    if (schedKey === key) {
      maxCapacity = parseInt(row[4]) || 10;
      break;
    }
  }

  if (currentBookings >= maxCapacity) {
    return jsonResponse({ success: false, error: 'このレッスンは満員です' });
  }

  // Check for duplicate booking (same name + same slot)
  for (var i = 1; i < bookingData.length; i++) {
    var row = bookingData[i];
    var rowKey = formatDate(row[0]) + '|' + row[1] + '|' + row[2] + '|' + row[3];
    if (rowKey === key && row[4] === name) {
      return jsonResponse({ success: false, error: name + 'さんは既にこのレッスンを予約済みです' });
    }
  }

  // Add booking
  bookingSheet.appendRow([
    date,
    studio,
    time,
    className,
    name,
    phone,
    new Date()
  ]);

  // Send email notification
  sendBookingNotification(date, studio, time, className, name, phone);

  return jsonResponse({ success: true, message: '予約が完了しました' });
}

/**
 * 予約通知メールを送信
 */
function sendBookingNotification(date, studio, time, className, name, phone) {
  try {
    var subject = '【BTM予約】' + name + 'さん — ' + date + ' ' + className;
    var body = '新しい予約が入りました\n\n'
      + '━━━━━━━━━━━━━━━━━━━━\n'
      + '日付: ' + date + '\n'
      + 'スタジオ: ' + studio + '\n'
      + '時間: ' + time + '\n'
      + 'クラス: ' + className + '\n'
      + 'お名前: ' + name + '\n'
      + '電話番号: ' + (phone || '未入力') + '\n'
      + '予約日時: ' + Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm') + '\n'
      + '━━━━━━━━━━━━━━━━━━━━\n\n'
      + 'スプレッドシートで確認:\n'
      + SpreadsheetApp.getActiveSpreadsheet().getUrl();
    GmailApp.sendEmail(ADMIN_EMAIL, subject, body);
  } catch (e) {
    // メール送信失敗しても予約自体は成功させる
    Logger.log('メール送信エラー: ' + e.message);
  }
}

/**
 * 予約一覧を日付別にグループ化して返す
 */
function getBookingList() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var bookingSheet = ss.getSheetByName('予約一覧');
  var scheduleSheet = ss.getSheetByName('スケジュール');

  if (!bookingSheet || !scheduleSheet) {
    return jsonResponse({ error: 'シートが見つかりません' });
  }

  var bookingData = bookingSheet.getDataRange().getValues();
  var scheduleData = scheduleSheet.getDataRange().getValues();

  // Build capacity map
  var capacityMap = {};
  for (var i = 1; i < scheduleData.length; i++) {
    var r = scheduleData[i];
    var k = formatDate(r[0]) + '|' + r[1] + '|' + r[2] + '|' + r[3];
    capacityMap[k] = parseInt(r[4]) || 10;
  }

  // Group bookings by date > slot
  var grouped = {};
  for (var i = 1; i < bookingData.length; i++) {
    var row = bookingData[i];
    var dateStr = formatDate(row[0]);
    var studio = String(row[1]);
    var time = String(row[2]);
    var className = String(row[3]);
    var slotKey = studio + '|' + time + '|' + className;
    var capKey = dateStr + '|' + studio + '|' + time + '|' + className;

    if (!grouped[dateStr]) grouped[dateStr] = {};
    if (!grouped[dateStr][slotKey]) {
      grouped[dateStr][slotKey] = {
        studio: studio,
        time: time,
        class_name: className,
        max: capacityMap[capKey] || 10,
        members: []
      };
    }
    grouped[dateStr][slotKey].members.push({
      name: String(row[4]),
      phone: String(row[5] || ''),
      booked_at: row[6] instanceof Date ? Utilities.formatDate(row[6], 'Asia/Tokyo', 'MM/dd HH:mm') : String(row[6])
    });
  }

  // Convert to sorted array
  var result = [];
  var dates = Object.keys(grouped).sort();
  for (var d = 0; d < dates.length; d++) {
    var dateStr = dates[d];
    var slots = [];
    var slotKeys = Object.keys(grouped[dateStr]);
    for (var s = 0; s < slotKeys.length; s++) {
      slots.push(grouped[dateStr][slotKeys[s]]);
    }
    result.push({ date: dateStr, slots: slots });
  }

  return jsonResponse(result);
}

/**
 * Date object を文字列に変換
 */
function formatDate(date) {
  if (date instanceof Date) {
    var m = date.getMonth() + 1;
    var d = date.getDate();
    return date.getFullYear() + '/' + (m < 10 ? '0' + m : m) + '/' + (d < 10 ? '0' + d : d);
  }
  return String(date);
}

/**
 * JSON レスポンスを返す
 */
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
