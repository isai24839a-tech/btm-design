/**
 * BEAT THE MIX — 予約システム 完全版 (Google Apps Script)
 *
 * ★セットアップ手順:
 * 1. Google Spreadsheetを新規作成（空でOK）
 * 2. 「拡張機能」→「Apps Script」を開く
 * 3. このファイルの内容を全てコピーしてエディタに貼り付け
 * 4. ★setupSheets()を1回だけ実行（上部メニューで関数選択→▶実行）
 *    → 5シート + ヘッダーが自動作成される
 * 5. 「デプロイ」→「新しいデプロイ」→ 種類「ウェブアプリ」
 *    - 実行ユーザー: 自分
 *    - アクセス権: 全員
 * 6. 表示されたURLをコピーして、members-page.html の APPS_SCRIPT_URL に設定
 * 7. スプレッドシートのIDをコピーして、kids-news.html / future-news.html の SPREADSHEET_ID に設定
 */

// ===== 設定 =====
var ADMIN_EMAIL = 'beat.the.mix7386@gmail.com';
var ADMIN_KEY = 'btmadmin2026'; // members-page.htmlのADMIN_PASSWORDと合わせる
var IMAGE_FOLDER_NAME = 'BTM_お知らせ画像';

function getOrCreateImageFolder() {
  var folders = DriveApp.getFoldersByName(IMAGE_FOLDER_NAME);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(IMAGE_FOLDER_NAME);
}

// ===== 初期セットアップ（1回だけ実行）=====
function setupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var sheets = [
    { name: 'スケジュール', headers: ['日付', 'スタジオ', '時間', 'クラス', '定員', 'category'] },
    { name: '予約一覧', headers: ['日付', 'スタジオ', '時間', 'クラス', 'お名前', 'メール', '予約日時'] },
    { name: 'お知らせ', headers: ['日付', 'タイトル', '内容', '重要度', '画像'] },
    { name: '定期レッスン', headers: ['曜日', 'スタジオ', '時間', 'クラス', 'カテゴリ'] },
    { name: 'KIDSニュース', headers: ['日付', 'タイトル', '内容', 'カテゴリ', '画像URL'] },
    { name: 'FUTUREニュース', headers: ['日付', 'タイトル', '内容', 'カテゴリ', '画像URL'] }
  ];

  sheets.forEach(function(def) {
    var sheet = ss.getSheetByName(def.name);
    if (!sheet) {
      sheet = ss.insertSheet(def.name);
    }
    // Set headers in row 1
    var range = sheet.getRange(1, 1, 1, def.headers.length);
    range.setValues([def.headers]);
    range.setFontWeight('bold');
    range.setBackground('#4285f4');
    range.setFontColor('#ffffff');
    // Auto-resize columns
    for (var i = 1; i <= def.headers.length; i++) {
      sheet.autoResizeColumn(i);
    }
  });

  // Delete default "Sheet1" if empty
  var sheet1 = ss.getSheetByName('Sheet1') || ss.getSheetByName('シート1');
  if (sheet1 && sheet1.getLastRow() === 0) {
    try { ss.deleteSheet(sheet1); } catch(e) {}
  }

  SpreadsheetApp.getUi().alert('セットアップ完了！ 5シート作成しました。\n\n次は「デプロイ」→「新しいデプロイ」→「ウェブアプリ」でデプロイしてください。');
}

// ===== メインルーター =====
function doGet(e) {
  var action = (e.parameter.action || '').toLowerCase();

  // Public actions (read-only)
  if (action === 'slots') return getAvailableSlots();
  if (action === 'book') return bookSlot(e.parameter);
  if (action === 'list') return getBookingList();
  if (action === 'announcements') return getAnnouncements();
  if (action === 'regularlessons') return getRegularLessons();

  return jsonResponse({ error: 'Unknown action' });
}

// Admin actions are POST-only (adminKey is in the request body, not the URL)
function doPost(e) {
  var payload;
  try {
    payload = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse({ error: 'Invalid request body' });
  }

  var action = (payload.action || '').toLowerCase();

  if (action === 'addslot') return adminGuardPost(payload, adminAddSlot);
  if (action === 'deleteslot') return adminGuardPost(payload, adminDeleteSlot);
  if (action === 'cancelbooking') return adminGuardPost(payload, adminCancelBooking);
  if (action === 'addannouncement') return adminGuardPost(payload, adminAddAnnouncement);
  if (action === 'deleteannouncement') return adminGuardPost(payload, adminDeleteAnnouncement);
  if (action === 'addregularlesson') return adminGuardPost(payload, adminAddRegularLesson);
  if (action === 'deleteregularlesson') return adminGuardPost(payload, adminDeleteRegularLesson);
  if (action === 'editregularlesson') return adminGuardPost(payload, adminEditRegularLesson);
  if (action === 'editslot') return adminGuardPost(payload, adminEditSlot);
  if (action === 'formatsheets') return adminGuardPost(payload, adminFormatSheets);

  return jsonResponse({ error: 'Unknown action' });
}

function adminGuardPost(payload, fn) {
  if (payload.adminKey !== ADMIN_KEY) {
    return jsonResponse({ success: false, error: '管理者認証に失敗しました' });
  }
  return fn(payload);
}

// ===== 空きレッスン一覧 =====
function getAvailableSlots() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var scheduleSheet = ss.getSheetByName('スケジュール');
  var bookingSheet = ss.getSheetByName('予約一覧');

  if (!scheduleSheet || !bookingSheet) {
    return jsonResponse({ error: 'シートが見つかりません' });
  }

  var scheduleData = scheduleSheet.getDataRange().getValues();
  if (scheduleData.length <= 1) return jsonResponse([]);

  var bookingData = bookingSheet.getDataRange().getValues();
  var bookingCounts = {};
  for (var i = 1; i < bookingData.length; i++) {
    var row = bookingData[i];
    var key = formatDate(row[0]) + '|' + row[1] + '|' + row[2] + '|' + row[3];
    bookingCounts[key] = (bookingCounts[key] || 0) + 1;
  }

  var slots = [];
  var today = new Date();
  today.setHours(0, 0, 0, 0);

  for (var i = 1; i < scheduleData.length; i++) {
    var row = scheduleData[i];
    var date = row[0];
    var studio = row[1] || '';
    var time = row[2] || '';
    var className = row[3] || '';
    var maxCapacity = (row[4] !== '' && row[4] != null) ? parseInt(row[4]) : 10;
    var category = row[5] || '';

    if (date instanceof Date && date < today) continue;

    var dateStr = formatDate(date);
    var key = dateStr + '|' + studio + '|' + time + '|' + className;
    var booked = bookingCounts[key] || 0;
    var available = (maxCapacity === 0) ? 999 : maxCapacity - booked;

    slots.push({
      date: dateStr,
      studio: String(studio),
      time: String(time),
      class_name: String(className),
      max: maxCapacity,
      booked: booked,
      available: Math.max(0, available),
      category: String(category)
    });
  }

  return jsonResponse(slots);
}

// ===== 予約登録 =====
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
  var email = params.email || '';

  if (!name) {
    return jsonResponse({ success: false, error: 'お名前を入力してください' });
  }

  var bookingData = bookingSheet.getDataRange().getValues();
  var key = date + '|' + studio + '|' + time + '|' + className;
  var currentBookings = 0;

  for (var i = 1; i < bookingData.length; i++) {
    var row = bookingData[i];
    var rowKey = formatDate(row[0]) + '|' + row[1] + '|' + row[2] + '|' + row[3];
    if (rowKey === key) currentBookings++;
  }

  // Find max capacity
  var scheduleData = scheduleSheet.getDataRange().getValues();
  var maxCapacity = 10;
  for (var i = 1; i < scheduleData.length; i++) {
    var row = scheduleData[i];
    var schedKey = formatDate(row[0]) + '|' + row[1] + '|' + row[2] + '|' + row[3];
    if (schedKey === key) {
      maxCapacity = (row[4] !== '' && row[4] != null) ? parseInt(row[4]) : 10;
      break;
    }
  }

  // maxCapacity=0 means unlimited
  if (maxCapacity > 0 && currentBookings >= maxCapacity) {
    return jsonResponse({ success: false, error: 'このレッスンは満員です' });
  }

  // Duplicate check
  for (var i = 1; i < bookingData.length; i++) {
    var row = bookingData[i];
    var rowKey = formatDate(row[0]) + '|' + row[1] + '|' + row[2] + '|' + row[3];
    if (rowKey === key && row[4] === name) {
      return jsonResponse({ success: false, error: name + 'さんは既にこのレッスンを予約済みです' });
    }
  }

  bookingSheet.appendRow([date, studio, time, className, name, email, new Date()]);

  sendBookingNotification(date, studio, time, className, name, email);
  if (email) sendBookingConfirmation(email, date, studio, time, className, name);

  return jsonResponse({ success: true, message: '予約が完了しました' });
}

// ===== 予約通知メール =====
function sendBookingNotification(date, studio, time, className, name, email) {
  try {
    var subject = '【BTM予約】' + name + 'さん — ' + date + ' ' + className;
    var body = '新しい予約が入りました\n\n'
      + '━━━━━━━━━━━━━━━━━━━━\n'
      + '日付: ' + date + '\n'
      + 'スタジオ: ' + studio + '\n'
      + '時間: ' + time + '\n'
      + 'クラス: ' + className + '\n'
      + 'お名前: ' + name + '\n'
      + 'メール: ' + (email || '未入力') + '\n'
      + '予約日時: ' + Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm') + '\n'
      + '━━━━━━━━━━━━━━━━━━━━\n\n'
      + 'スプレッドシートで確認:\n'
      + SpreadsheetApp.getActiveSpreadsheet().getUrl();
    GmailApp.sendEmail(ADMIN_EMAIL, subject, body);
  } catch (e) {
    Logger.log('メール送信エラー: ' + e.message);
  }
}

function sendBookingConfirmation(email, date, studio, time, className, name) {
  try {
    var subject = '【BEAT THE MIX】予約確認 — ' + date + ' ' + className;
    var body = name + ' 様\n\n'
      + 'ご予約ありがとうございます。\n'
      + '以下の内容で予約を受け付けました。\n\n'
      + '━━━━━━━━━━━━━━━━━━━━\n'
      + '日付: ' + date + '\n'
      + 'スタジオ: ' + studio + '\n'
      + '時間: ' + time + '\n'
      + 'クラス: ' + className + '\n'
      + '━━━━━━━━━━━━━━━━━━━━\n\n'
      + 'キャンセル・変更のご連絡:\n'
      + 'LINEにてご連絡ください。\n\n'
      + '当日お会いできることを楽しみにしています！\n\n'
      + 'BEAT THE MIX ダンススタジオ\n\n'
      + '─────────────────────\n'
      + '※このメールは送信専用です。\n'
      + '　このメールに返信しても届きませんので\n'
      + '　ご了承ください。';
    GmailApp.sendEmail(email, subject, body);
  } catch (e) {
    Logger.log('確認メール送信エラー: ' + e.message);
  }
}

// ===== 予約一覧（日付別グループ） =====
function getBookingList() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var bookingSheet = ss.getSheetByName('予約一覧');
  var scheduleSheet = ss.getSheetByName('スケジュール');

  if (!bookingSheet || !scheduleSheet) return jsonResponse({ error: 'シートが見つかりません' });

  var bookingData = bookingSheet.getDataRange().getValues();
  var scheduleData = scheduleSheet.getDataRange().getValues();

  var capacityMap = {};
  for (var i = 1; i < scheduleData.length; i++) {
    var r = scheduleData[i];
    var k = formatDate(r[0]) + '|' + r[1] + '|' + r[2] + '|' + r[3];
    capacityMap[k] = (r[4] !== '' && r[4] != null) ? parseInt(r[4]) : 10;
  }

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
        studio: studio, time: time, class_name: className,
        max: capacityMap[capKey] || 10, members: []
      };
    }
    grouped[dateStr][slotKey].members.push({
      name: String(row[4]),
      email: String(row[5] || ''),
      booked_at: row[6] instanceof Date ? Utilities.formatDate(row[6], 'Asia/Tokyo', 'MM/dd HH:mm') : String(row[6])
    });
  }

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

// ===== お知らせ取得 =====
function getAnnouncements() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('お知らせ');
  if (!sheet || sheet.getLastRow() <= 1) return jsonResponse([]);

  var data = sheet.getDataRange().getValues();
  var items = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[1]) continue; // skip empty title
    var imageIds = String(row[4] || '').split(',').filter(function(s) { return s.trim(); });
    var imageUrls = imageIds.map(function(id) { return 'https://lh3.googleusercontent.com/d/' + id.trim(); });
    items.push({
      date: formatDate(row[0]),
      title: String(row[1]),
      content: String(row[2] || ''),
      importance: String(row[3] || ''),
      images: imageUrls,
      row: i + 1
    });
  }
  return jsonResponse(items);
}

// ===== 定期レッスン取得 =====
function getRegularLessons() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('定期レッスン');
  if (!sheet || sheet.getLastRow() <= 1) return jsonResponse([]);

  var data = sheet.getDataRange().getValues();
  var items = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;
    items.push({
      dayOfWeek: String(row[0]),
      studio: String(row[1] || ''),
      time: String(row[2] || ''),
      class_name: String(row[3] || ''),
      category: String(row[4] || 'KIDS').toUpperCase(),
      row: i + 1
    });
  }
  return jsonResponse(items);
}

// ===== 管理者: レッスン枠追加 =====
function adminAddSlot(params) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('スケジュール');
  if (!sheet) return jsonResponse({ success: false, error: 'スケジュールシートがありません' });

  var date = params.date || '';
  var studio = params.studio || '';
  var time = params.time || '';
  var className = params.class_name || '';
  var max = (params.max !== undefined && params.max !== '') ? parseInt(params.max) : 8;
  var category = params.category || '';

  if (!date || !studio || !className) {
    return jsonResponse({ success: false, error: '必須項目が不足しています' });
  }

  sheet.appendRow([date, studio, time, className, max, category]);
  return jsonResponse({ success: true, message: 'レッスン枠を追加しました' });
}

// ===== 管理者: レッスン枠削除 =====
function adminDeleteSlot(params) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('スケジュール');
  if (!sheet) return jsonResponse({ success: false, error: 'シートがありません' });

  var date = params.date || '';
  var studio = params.studio || '';
  var time = params.time || '';

  var data = sheet.getDataRange().getValues();
  for (var i = data.length - 1; i >= 1; i--) {
    var row = data[i];
    if (formatDate(row[0]) === date && String(row[1]) === studio && String(row[2]) === time) {
      sheet.deleteRow(i + 1);
      return jsonResponse({ success: true, message: '削除しました' });
    }
  }

  return jsonResponse({ success: false, error: '該当するレッスン枠が見つかりません' });
}

// ===== 管理者: 予約キャンセル =====
function adminCancelBooking(params) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('予約一覧');
  if (!sheet) return jsonResponse({ success: false, error: 'シートがありません' });

  var date = params.date || '';
  var studio = params.studio || '';
  var time = params.time || '';
  var name = params.name || '';

  var data = sheet.getDataRange().getValues();
  for (var i = data.length - 1; i >= 1; i--) {
    var row = data[i];
    if (formatDate(row[0]) === date && String(row[1]) === studio && String(row[2]) === time && String(row[4]) === name) {
      sheet.deleteRow(i + 1);
      return jsonResponse({ success: true, message: name + 'さんの予約をキャンセルしました' });
    }
  }

  return jsonResponse({ success: false, error: '該当する予約が見つかりません' });
}

// ===== 管理者: お知らせ追加 =====
function adminAddAnnouncement(params) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('お知らせ');
  if (!sheet) return jsonResponse({ success: false, error: 'お知らせシートがありません' });

  var date = params.date || formatDate(new Date());
  var title = params.title || '';
  var content = params.content || '';
  var importance = params.importance || '';

  if (!title) return jsonResponse({ success: false, error: 'タイトルを入力してください' });

  var imageIds = [];
  if (params.images && params.images.length > 0) {
    var folder = getOrCreateImageFolder();
    for (var i = 0; i < Math.min(params.images.length, 5); i++) {
      var imgData = params.images[i];
      var match = imgData.match(/^data:image\/(.*?);base64,(.*)$/);
      if (match) {
        var ext = match[1].replace('jpeg', 'jpg');
        var bytes = Utilities.base64Decode(match[2]);
        var blob = Utilities.newBlob(bytes, 'image/' + match[1], 'btm_' + Date.now() + '_' + i + '.' + ext);
        var file = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        imageIds.push(file.getId());
      }
    }
  }

  sheet.appendRow([date, title, content, importance, imageIds.join(',')]);
  return jsonResponse({ success: true, message: 'お知らせを追加しました' });
}

// ===== 管理者: お知らせ削除 =====
function adminDeleteAnnouncement(params) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('お知らせ');
  if (!sheet) return jsonResponse({ success: false, error: 'シートがありません' });

  var row = parseInt(params.row);
  if (!row || row < 2) return jsonResponse({ success: false, error: '無効な行番号です' });

  if (row > sheet.getLastRow()) return jsonResponse({ success: false, error: '該当する行がありません' });

  // Delete associated images from Drive
  var imageCol = sheet.getRange(row, 5).getValue();
  if (imageCol) {
    var ids = String(imageCol).split(',').filter(function(s) { return s.trim(); });
    for (var i = 0; i < ids.length; i++) {
      try { DriveApp.getFileById(ids[i].trim()).setTrashed(true); } catch(e) {}
    }
  }

  sheet.deleteRow(row);
  return jsonResponse({ success: true, message: '削除しました' });
}

// ===== 管理者: 定期レッスン追加 =====
function adminAddRegularLesson(params) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('定期レッスン');
  if (!sheet) return jsonResponse({ success: false, error: '定期レッスンシートがありません' });

  var dayOfWeek = params.dayOfWeek || '';
  var studio = params.studio || '';
  var time = params.time || '';
  var className = params.class_name || '';
  var category = params.category || 'KIDS';

  if (!dayOfWeek || !className) return jsonResponse({ success: false, error: '曜日とクラス名は必須です' });

  sheet.appendRow([dayOfWeek, studio, time, className, category]);
  return jsonResponse({ success: true, message: '定期レッスンを追加しました' });
}

// ===== 管理者: 定期レッスン削除 =====
function adminDeleteRegularLesson(params) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('定期レッスン');
  if (!sheet) return jsonResponse({ success: false, error: 'シートがありません' });

  var row = parseInt(params.row);
  if (!row || row < 2) return jsonResponse({ success: false, error: '無効な行番号です' });
  if (row > sheet.getLastRow()) return jsonResponse({ success: false, error: '該当する行がありません' });

  sheet.deleteRow(row);
  return jsonResponse({ success: true, message: '削除しました' });
}

// ===== 管理者: 定期レッスン編集 =====
function adminEditRegularLesson(params) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('定期レッスン');
  if (!sheet) return jsonResponse({ success: false, error: 'シートがありません' });

  var row = parseInt(params.row);
  if (!row || row < 2 || row > sheet.getLastRow()) return jsonResponse({ success: false, error: '無効な行番号です' });

  var dayOfWeek = params.dayOfWeek || '';
  var studio = params.studio || '';
  var time = params.time || '';
  var className = params.class_name || '';
  var category = params.category || 'KIDS';

  sheet.getRange(row, 1, 1, 5).setValues([[dayOfWeek, studio, time, className, category]]);
  return jsonResponse({ success: true, message: '更新しました' });
}

// ===== 管理者: 予約枠編集 =====
function adminEditSlot(params) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('スケジュール');
  if (!sheet) return jsonResponse({ success: false, error: 'シートがありません' });

  var oldDate = params.old_date || '';
  var oldStudio = params.old_studio || '';
  var oldTime = params.old_time || '';

  var data = sheet.getDataRange().getValues();
  for (var i = data.length - 1; i >= 1; i--) {
    var r = data[i];
    if (formatDate(r[0]) === oldDate && String(r[1]) === oldStudio && String(r[2]) === oldTime) {
      var newDate = params.date || oldDate;
      var newStudio = params.studio || oldStudio;
      var newTime = params.time || oldTime;
      var newClass = params.class_name || String(r[3]);
      var newMax = params.max !== undefined ? parseInt(params.max) : r[4];
      var newCat = params.category || String(r[5] || '');
      sheet.getRange(i + 1, 1, 1, 6).setValues([[newDate, newStudio, newTime, newClass, newMax, newCat]]);
      return jsonResponse({ success: true, message: '更新しました' });
    }
  }
  return jsonResponse({ success: false, error: '該当するレッスン枠が見つかりません' });
}

// ===== 管理者: シート列幅自動調整 =====
function adminFormatSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  for (var s = 0; s < sheets.length; s++) {
    var sheet = sheets[s];
    var lastCol = sheet.getLastColumn();
    if (lastCol > 0) {
      for (var c = 1; c <= lastCol; c++) {
        sheet.autoResizeColumn(c);
      }
      // Add padding (minimum 120px)
      for (var c = 1; c <= lastCol; c++) {
        var w = sheet.getColumnWidth(c);
        if (w < 120) sheet.setColumnWidth(c, 120);
      }
    }
  }
  return jsonResponse({ success: true, message: '全シートの列幅を調整しました' });
}

// ===== ユーティリティ =====
function formatDate(date) {
  if (date instanceof Date) {
    var m = date.getMonth() + 1;
    var d = date.getDate();
    return date.getFullYear() + '/' + (m < 10 ? '0' + m : m) + '/' + (d < 10 ? '0' + d : d);
  }
  return String(date);
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
