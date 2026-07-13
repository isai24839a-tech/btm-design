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
var ADMIN_EMAILS = ['beat.the.mix7386@gmail.com', 'isai24839a@gmail.com'];
var ADMIN_KEY = 'potofu7386'; // members-page.htmlのADMIN_PASSWORDと合わせる
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
    { name: '予約一覧KIDS', headers: ['日付', 'スタジオ', '時間', 'クラス', 'お名前', 'メール', '予約日時', '登録スタジオ'] },
    { name: '予約一覧FUTURE', headers: ['日付', 'スタジオ', '時間', 'クラス', 'お名前', 'メール', '予約日時', '登録スタジオ'] },
    { name: 'お知らせ', headers: ['日付', 'タイトル', '内容', '重要度', '画像', 'カテゴリ', 'ピン留め'] },
    { name: '定期レッスン', headers: ['曜日', 'スタジオ', '時間', 'クラス', 'カテゴリ', '頻度', '基準日', '定員', '期間開始', '期間終了'] },
    { name: 'KIDSニュース', headers: ['日付', 'タイトル', '内容', 'カテゴリ', '画像URL'] },
    { name: 'FUTUREニュース', headers: ['日付', 'タイトル', '内容', 'カテゴリ', '画像URL'] },
    { name: '全体ニュース', headers: ['日付', 'タイトル', '内容', 'カテゴリ', '画像URL'] },
    { name: '定期休み', headers: ['曜日', 'スタジオ', 'category'] },
    { name: '臨時キャンセル', headers: ['日付', 'スタジオ', '時間', 'クラス', 'カテゴリ'] },
    { name: '不定休', headers: ['日付', '理由', 'カテゴリ'] },
    { name: '臨時メモ', headers: ['日付', 'スタジオ', '時間', 'メモ', 'カテゴリ'] },
    { name: 'キャンセル待ち', headers: ['日付', 'スタジオ', '時間', 'クラス', 'ニックネーム', 'メール', '登録日時'] }
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

// ===== 予約シート（KIDS/FUTURE分割） =====
var BOOKING_HEADERS = ['日付', 'スタジオ', '時間', 'クラス', 'お名前', 'メール', '予約日時', '登録スタジオ'];

// カテゴリに対応する予約シートを取得（無ければ作成・再デプロイのみでOK）
function getBookingSheetByCategory(category) {
  var name = (String(category || '').toUpperCase() === 'FUTURE') ? '予約一覧FUTURE' : '予約一覧KIDS';
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    var range = sheet.getRange(1, 1, 1, BOOKING_HEADERS.length);
    range.setValues([BOOKING_HEADERS]);
    range.setFontWeight('bold');
    range.setBackground('#4285f4');
    range.setFontColor('#ffffff');
  }
  return sheet;
}

// 予約が入っている全シート（KIDS/FUTURE）。旧「予約一覧」が残っていれば先に自動移行する
function getBookingSheets() {
  migrateLegacyBookingSheet();
  return [getBookingSheetByCategory('KIDS'), getBookingSheetByCategory('FUTURE')];
}

// 全予約行を連結して返す（ヘッダー行なし・列構成は旧「予約一覧」と同じ）
function getAllBookingRows() {
  var rows = [];
  getBookingSheets().forEach(function(sheet) {
    if (sheet.getLastRow() <= 1) return;
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) rows.push(data[i]);
  });
  return rows;
}

// 予約行をまとめて追記（列数を8列に正規化）
function appendBookingRows(sheet, rows) {
  if (!rows.length) return;
  var norm = rows.map(function(r) {
    var out = r.slice(0, BOOKING_HEADERS.length);
    while (out.length < BOOKING_HEADERS.length) out.push('');
    return out;
  });
  sheet.getRange(sheet.getLastRow() + 1, 1, norm.length, BOOKING_HEADERS.length).setValues(norm);
}

// 旧「予約一覧」シートの行をカテゴリ判定してKIDS/FUTUREへ移し、旧シートを削除（初回1回だけ動く）
function migrateLegacyBookingSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var legacy = ss.getSheetByName('予約一覧');
  if (!legacy) return;

  var kidsRows = [];
  var futureRows = [];
  if (legacy.getLastRow() > 1) {
    var scheduleCat = {};
    var scheduleSheet = ss.getSheetByName('スケジュール');
    if (scheduleSheet && scheduleSheet.getLastRow() > 1) {
      var sData = scheduleSheet.getDataRange().getValues();
      for (var i = 1; i < sData.length; i++) {
        var r = sData[i];
        scheduleCat[formatDate(r[0]) + '|' + r[1] + '|' + r[2] + '|' + r[3]] = String(r[5] || '');
      }
    }
    var regData = getRegularLessonData();
    var data = legacy.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row[0] && !row[3] && !row[4]) continue; // 空行はスキップ
      var key = formatDate(row[0]) + '|' + row[1] + '|' + row[2] + '|' + row[3];
      var cat = scheduleCat[key];
      if (!cat) cat = findRegularLessonCategoryLoose(regData, row[1], row[2], row[3]);
      if (String(cat || '').toUpperCase() === 'FUTURE') futureRows.push(row);
      else kidsRows.push(row); // 判定不能はKIDS扱い（読み取りは両シート横断なので機能影響なし）
    }
  }

  appendBookingRows(getBookingSheetByCategory('KIDS'), kidsRows);
  appendBookingRows(getBookingSheetByCategory('FUTURE'), futureRows);
  ss.deleteSheet(legacy);
}

// 移行時のカテゴリ判定用: スタジオ+時間+クラス名一致で定期レッスンのカテゴリを引く（期間・曜日は問わない）
function findRegularLessonCategoryLoose(regData, studio, time, className) {
  if (!regData) return '';
  for (var i = 1; i < regData.length; i++) {
    var row = regData[i];
    if (String(row[1] || '') === String(studio) && String(row[2] || '') === String(time) &&
        String(row[3] || '') === String(className)) {
      return String(row[4] || '');
    }
  }
  return '';
}

// ===== メインルーター =====
function doGet(e) {
  var action = (e.parameter.action || '').toLowerCase();

  // Public actions (read-only)
  if (action === 'slots') return getAvailableSlots();
  if (action === 'book') return bookSlot(e.parameter);
  if (action === 'waitlist') return joinWaitlist(e.parameter);
  if (action === 'list') return getBookingList();
  if (action === 'announcements') return getAnnouncements();
  if (action === 'regularlessons') return getRegularLessons();
  if (action === 'regularholidays') return getRegularHolidays();
  if (action === 'lessoncancels') return getLessonCancels();
  if (action === 'irregularholidays') return getIrregularHolidays();
  if (action === 'lessonnotes') return getLessonNotes();
  if (action === 'capacityoverrides') return getCapacityOverrides();

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
  if (action === 'editannouncement') return adminGuardPost(payload, adminEditAnnouncement);
  if (action === 'addregularlesson') return adminGuardPost(payload, adminAddRegularLesson);
  if (action === 'deleteregularlesson') return adminGuardPost(payload, adminDeleteRegularLesson);
  if (action === 'editregularlesson') return adminGuardPost(payload, adminEditRegularLesson);
  if (action === 'editslot') return adminGuardPost(payload, adminEditSlot);
  if (action === 'formatsheets') return adminGuardPost(payload, adminFormatSheets);
  if (action === 'addregularholiday') return adminGuardPost(payload, adminAddRegularHoliday);
  if (action === 'deleteregularholiday') return adminGuardPost(payload, adminDeleteRegularHoliday);
  if (action === 'togglepinannouncement') return adminGuardPost(payload, adminTogglePinAnnouncement);
  if (action === 'addlessoncancel') return adminGuardPost(payload, adminAddLessonCancel);
  if (action === 'deletelessoncancel') return adminGuardPost(payload, adminDeleteLessonCancel);
  if (action === 'addirregularholiday') return adminGuardPost(payload, adminAddIrregularHoliday);
  if (action === 'deleteirregularholiday') return adminGuardPost(payload, adminDeleteIrregularHoliday);
  if (action === 'addlessonnote') return adminGuardPost(payload, adminAddLessonNote);
  if (action === 'deletelessonnote') return adminGuardPost(payload, adminDeleteLessonNote);
  if (action === 'addcapacityoverride') return adminGuardPost(payload, adminAddCapacityOverride);
  if (action === 'deletecapacityoverride') return adminGuardPost(payload, adminDeleteCapacityOverride);

  // Member action (no adminKey): booker cancels their own reservation
  if (action === 'membercancelbooking') return memberCancelBooking(payload);

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

  if (!scheduleSheet) {
    return jsonResponse({ error: 'シートが見つかりません' });
  }

  var scheduleData = scheduleSheet.getDataRange().getValues();
  if (scheduleData.length <= 1) return jsonResponse([]);

  var bookingData = getAllBookingRows();
  var bookingCounts = {};
  var bookingMembers = {};
  for (var i = 0; i < bookingData.length; i++) {
    var row = bookingData[i];
    var key = formatDate(row[0]) + '|' + row[1] + '|' + row[2] + '|' + row[3];
    bookingCounts[key] = (bookingCounts[key] || 0) + 1;
    if (!bookingMembers[key]) bookingMembers[key] = [];
    bookingMembers[key].push({
      name: String(row[4]),
      booked_at: row[6] instanceof Date ? Utilities.formatDate(row[6], 'Asia/Tokyo', 'MM/dd HH:mm') : String(row[6] || ''),
      home: row[7] ? true : false
    });
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
      category: String(category),
      members: bookingMembers[key] || []
    });
  }

  return jsonResponse(slots);
}

// ===== 予約登録 =====
function bookSlot(params) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var scheduleSheet = ss.getSheetByName('スケジュール');

  if (!scheduleSheet) {
    return jsonResponse({ success: false, error: 'シートが見つかりません' });
  }

  var date = params.date || '';
  var studio = params.studio || '';
  var time = params.time || '';
  var className = params.class_name || '';
  var name = params.name || '';
  var email = params.email || '';
  var homeStudio = params.home_studio === '1';

  if (!name) {
    return jsonResponse({ success: false, error: 'お名前を入力してください' });
  }

  var bookingData = getAllBookingRows();
  var key = date + '|' + studio + '|' + time + '|' + className;
  var currentBookings = 0;

  for (var i = 0; i < bookingData.length; i++) {
    var row = bookingData[i];
    var rowKey = formatDate(row[0]) + '|' + row[1] + '|' + row[2] + '|' + row[3];
    if (rowKey === key) currentBookings++;
  }

  // Find max capacity and category (schedule slots first, then regular lessons)
  var scheduleData = scheduleSheet.getDataRange().getValues();
  var maxCapacity = 10;
  var isRegularLesson = false;
  var foundInSchedule = false;
  var lessonCategory = '';
  for (var i = 1; i < scheduleData.length; i++) {
    var row = scheduleData[i];
    var schedKey = formatDate(row[0]) + '|' + row[1] + '|' + row[2] + '|' + row[3];
    if (schedKey === key) {
      maxCapacity = (row[4] !== '' && row[4] != null) ? parseInt(row[4]) : 10;
      lessonCategory = String(row[5] || '').toUpperCase();
      foundInSchedule = true;
      break;
    }
  }

  var regData = getRegularLessonData();
  if (!foundInSchedule) {
    var regRow = matchRegularLesson(regData, date, studio, time, className);
    if (regRow !== null) {
      isRegularLesson = true;
      maxCapacity = (regRow[7] !== '' && regRow[7] != null) ? parseInt(regRow[7]) : 0; // 0 = unlimited
      lessonCategory = String(regRow[4] || 'KIDS').toUpperCase();
    } else {
      // スケジュール枠にも定期レッスン（開催期間内・隔週該当日）にも一致しない日は予約を受け付けない
      return jsonResponse({ success: false, error: 'この日はこのレッスンの開催日ではないため予約できません' });
    }
  }

  // Per-date capacity override (臨時定員 sheet) takes precedence over both sources
  var capOverride = findCapacityOverride(date, studio, time, className);
  if (capOverride !== null) maxCapacity = capOverride;

  // FUTURE lessons: one slot per lesson per person — block booking the same lesson twice
  if (lessonCategory === 'FUTURE') {
    var nameTrim = String(name).trim();
    for (var i = 0; i < bookingData.length; i++) {
      var bRow = bookingData[i];
      var bKey = formatDate(bRow[0]) + '|' + bRow[1] + '|' + bRow[2] + '|' + bRow[3];
      if (bKey === key && String(bRow[4] || '').trim() === nameTrim) {
        return jsonResponse({ success: false, error: '既に ' + date + '「' + className + '」をご予約済みです。同じレッスンのご予約はお一人1枠までです' });
      }
    }
  }

  // maxCapacity=0 means unlimited.
  // Regular lessons: when full, home-studio members (✅) can still book as priority; others are rejected.
  var overCapacity = false;
  if (maxCapacity > 0 && currentBookings >= maxCapacity) {
    if (isRegularLesson && homeStudio) {
      overCapacity = true;
    } else {
      return jsonResponse({ success: false, error: 'このレッスンは満員です' });
    }
  }

  // カテゴリ別の予約シートに記録（FUTURE以外はKIDSシートへ）
  getBookingSheetByCategory(lessonCategory).appendRow([date, studio, time, className, name, email, new Date(), homeStudio ? '✅' : '']);

  sendBookingNotification(date, studio, time, className, name, email, homeStudio, overCapacity);
  if (email) sendBookingConfirmation(email, date, studio, time, className, name);

  var msg = overCapacity ? '予約が完了しました（登録スタジオ生・優先受付）' : '予約が完了しました';
  return jsonResponse({ success: true, message: msg });
}

// ===== 定期レッスンシートの全行を取得（ヘッダー込み・シート無しはnull） =====
function getRegularLessonData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('定期レッスン');
  if (!sheet || sheet.getLastRow() <= 1) return null;
  return sheet.getDataRange().getValues();
}

// ===== 期間設定の値をDateに変換（Date型/文字列両対応・無効はnull） =====
function parsePeriodDate(v) {
  if (!v) return null;
  if (v instanceof Date) return new Date(v.getFullYear(), v.getMonth(), v.getDate());
  var p = String(v).split(/[\/\-]/);
  if (p.length !== 3) return null;
  return new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
}

// ===== 定期レッスン行を検索（該当なしはnull） =====
function matchRegularLesson(regData, dateStr, studio, time, className) {
  if (!regData) return null;
  var parts = String(dateStr).split('/');
  if (parts.length !== 3) return null;
  var dObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  var dowNames = ['日', '月', '火', '水', '木', '金', '土'];
  var dayName = dowNames[dObj.getDay()];

  for (var i = 1; i < regData.length; i++) {
    var row = regData[i];
    var matchDay = String(row[0]) === dayName || String(row[5]) === 'oneshot';
    if (matchDay && String(row[1] || '') === String(studio) &&
        String(row[2] || '') === String(time) && String(row[3] || '') === String(className)) {
      // 期間設定（oneshot以外）: 開催期間外の日はこの定期レッスンに該当しない
      if (String(row[5]) !== 'oneshot') {
        var ps = parsePeriodDate(row[8]);
        var pe = parsePeriodDate(row[9]);
        if (ps && dObj < ps) continue;
        if (pe && dObj > pe) continue;
      }
      return row;
    }
  }
  return null;
}

// ===== 予約通知メール =====
function sendBookingNotification(date, studio, time, className, name, email, homeStudio, overCapacity) {
  try {
    var subject = '【BTM予約】' + name + 'さん — ' + date + ' ' + className;
    if (overCapacity) subject = '【BTM予約・⚠定員超過優先受付】' + name + 'さん — ' + date + ' ' + className;
    var body = '新しい予約が入りました\n\n'
      + (overCapacity ? '⚠️ 定員超過ですが登録スタジオ生のため優先受付しました。調整が必要な場合はご対応ください。\n\n' : '')
      + '━━━━━━━━━━━━━━━━━━━━\n'
      + '日付: ' + date + '\n'
      + 'スタジオ: ' + studio + '\n'
      + '時間: ' + time + '\n'
      + 'クラス: ' + className + '\n'
      + 'お名前: ' + name + '\n'
      + '登録スタジオ生: ' + (homeStudio ? '✅ はい' : '—') + '\n'
      + 'メール: ' + (email || '未入力') + '\n'
      + '予約日時: ' + Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm') + '\n'
      + '━━━━━━━━━━━━━━━━━━━━\n\n'
      + 'スプレッドシートで確認:\n'
      + SpreadsheetApp.getActiveSpreadsheet().getUrl();
    ADMIN_EMAILS.forEach(function(addr) { GmailApp.sendEmail(addr, subject, body); });
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
  var scheduleSheet = ss.getSheetByName('スケジュール');

  if (!scheduleSheet) return jsonResponse({ error: 'シートが見つかりません' });

  var bookingData = getAllBookingRows();
  var scheduleData = scheduleSheet.getDataRange().getValues();

  var capacityMap = {};
  for (var i = 1; i < scheduleData.length; i++) {
    var r = scheduleData[i];
    var k = formatDate(r[0]) + '|' + r[1] + '|' + r[2] + '|' + r[3];
    capacityMap[k] = (r[4] !== '' && r[4] != null) ? parseInt(r[4]) : 10;
  }

  // Regular lesson capacities (keyed by studio|time|class, resolved when schedule has no entry)
  var regSheet = ss.getSheetByName('定期レッスン');
  var regCapMap = {};
  if (regSheet && regSheet.getLastRow() > 1) {
    var regData = regSheet.getDataRange().getValues();
    for (var i = 1; i < regData.length; i++) {
      var rr = regData[i];
      if (!rr[0]) continue;
      regCapMap[rr[1] + '|' + rr[2] + '|' + rr[3]] = (rr[7] !== '' && rr[7] != null) ? parseInt(rr[7]) : 0;
    }
  }

  var grouped = {};
  for (var i = 0; i < bookingData.length; i++) {
    var row = bookingData[i];
    var dateStr = formatDate(row[0]);
    var studio = String(row[1]);
    var time = String(row[2]);
    var className = String(row[3]);
    var slotKey = studio + '|' + time + '|' + className;
    var capKey = dateStr + '|' + studio + '|' + time + '|' + className;

    if (!grouped[dateStr]) grouped[dateStr] = {};
    if (!grouped[dateStr][slotKey]) {
      var cap = capacityMap[capKey];
      if (cap === undefined && regCapMap[slotKey] !== undefined) cap = regCapMap[slotKey];
      if (cap === undefined) cap = 10;
      grouped[dateStr][slotKey] = {
        studio: studio, time: time, class_name: className,
        max: cap, members: []
      };
    }
    grouped[dateStr][slotKey].members.push({
      name: String(row[4]),
      email: String(row[5] || ''),
      booked_at: row[6] instanceof Date ? Utilities.formatDate(row[6], 'Asia/Tokyo', 'MM/dd HH:mm') : String(row[6]),
      home: row[7] ? true : false
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
    var pinned = String(row[6] || '').toUpperCase() === 'TRUE';
    items.push({
      date: formatDate(row[0]),
      title: String(row[1]),
      content: String(row[2] || ''),
      importance: String(row[3] || ''),
      images: imageUrls,
      category: String(row[5] || ''),
      pinned: pinned,
      row: i + 1
    });
  }
  // Sort: pinned first, then by date descending
  items.sort(function(a, b) {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    // Both same pin status — sort by date descending
    if (a.date > b.date) return -1;
    if (a.date < b.date) return 1;
    return 0;
  });
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
      frequency: String(row[5] || 'weekly'),
      startDate: row[6] ? formatDate(row[6]) : '',
      max: (row[7] !== '' && row[7] != null) ? parseInt(row[7]) : 0,
      periodStart: row[8] ? formatDate(row[8]) : '',
      periodEnd: row[9] ? formatDate(row[9]) : '',
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
  var date = params.date || '';
  var studio = params.studio || '';
  var time = params.time || '';
  var name = params.name || '';

  var sheets = getBookingSheets();
  for (var s = 0; s < sheets.length; s++) {
    var sheet = sheets[s];
    if (sheet.getLastRow() <= 1) continue;
    var data = sheet.getDataRange().getValues();
    for (var i = data.length - 1; i >= 1; i--) {
      var row = data[i];
      if (formatDate(row[0]) === date && String(row[1]) === studio && String(row[2]) === time && String(row[4]) === name) {
        var cancelledClass = String(row[3] || '');
        sheet.deleteRow(i + 1);
        notifyWaitlistIfVacancy(date, studio, time, cancelledClass);
        return jsonResponse({ success: true, message: name + 'さんの予約をキャンセルしました' });
      }
    }
  }

  return jsonResponse({ success: false, error: '該当する予約が見つかりません' });
}

// ===== 予約者本人によるキャンセル（会員ページから・過去日は不可） =====
function memberCancelBooking(params) {
  var date = params.date || '';
  var studio = params.studio || '';
  var time = params.time || '';
  var className = params.class_name || '';
  var name = params.name || '';

  if (!name) return jsonResponse({ success: false, error: 'お名前が指定されていません' });

  // Past lessons cannot be cancelled by members
  var parts = String(date).split('/');
  if (parts.length === 3) {
    var lessonDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    if (lessonDate < today) {
      return jsonResponse({ success: false, error: '過去のレッスンはキャンセルできません' });
    }
  }

  var sheets = getBookingSheets();
  for (var s = 0; s < sheets.length; s++) {
    var sheet = sheets[s];
    if (sheet.getLastRow() <= 1) continue;
    var data = sheet.getDataRange().getValues();
    for (var i = data.length - 1; i >= 1; i--) {
      var row = data[i];
      if (formatDate(row[0]) === date && String(row[1]) === studio && String(row[2]) === time &&
          String(row[3]) === className && String(row[4]) === name) {
        var email = String(row[5] || '');
        sheet.deleteRow(i + 1);
        sendCancelNotification(date, studio, time, className, name);
        if (email) sendCancelConfirmation(email, date, studio, time, className, name);
        notifyWaitlistIfVacancy(date, studio, time, className);
        return jsonResponse({ success: true, message: '予約をキャンセルしました' });
      }
    }
  }

  return jsonResponse({ success: false, error: '該当する予約が見つかりません' });
}

// ===== キャンセル通知メール（管理者宛） =====
function sendCancelNotification(date, studio, time, className, name) {
  try {
    var subject = '【BTMキャンセル】' + name + 'さん — ' + date + ' ' + className;
    var body = '会員ページから予約がキャンセルされました\n\n'
      + '━━━━━━━━━━━━━━━━━━━━\n'
      + '日付: ' + date + '\n'
      + 'スタジオ: ' + studio + '\n'
      + '時間: ' + time + '\n'
      + 'クラス: ' + className + '\n'
      + 'お名前: ' + name + '\n'
      + 'キャンセル日時: ' + Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm') + '\n'
      + '━━━━━━━━━━━━━━━━━━━━\n\n'
      + 'スプレッドシートで確認:\n'
      + SpreadsheetApp.getActiveSpreadsheet().getUrl();
    ADMIN_EMAILS.forEach(function(addr) { GmailApp.sendEmail(addr, subject, body); });
  } catch (e) {
    Logger.log('キャンセル通知メール送信エラー: ' + e.message);
  }
}

// ===== キャンセル確認メール（予約者宛） =====
function sendCancelConfirmation(email, date, studio, time, className, name) {
  try {
    var subject = '【BEAT THE MIX】キャンセル確認 — ' + date + ' ' + className;
    var body = name + ' 様\n\n'
      + '以下のご予約をキャンセルしました。\n\n'
      + '━━━━━━━━━━━━━━━━━━━━\n'
      + '日付: ' + date + '\n'
      + 'スタジオ: ' + studio + '\n'
      + '時間: ' + time + '\n'
      + 'クラス: ' + className + '\n'
      + '━━━━━━━━━━━━━━━━━━━━\n\n'
      + 'またのご予約をお待ちしております。\n\n'
      + 'BEAT THE MIX ダンススタジオ\n\n'
      + '─────────────────────\n'
      + '※このメールは送信専用です。\n'
      + '　このメールに返信しても届きませんので\n'
      + '　ご了承ください。';
    GmailApp.sendEmail(email, subject, body);
  } catch (e) {
    Logger.log('キャンセル確認メール送信エラー: ' + e.message);
  }
}

// ===== キャンセル待ちシート取得（無ければ作成・既存デプロイでもsetupSheets再実行不要） =====
function getWaitlistSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('キャンセル待ち');
  if (!sheet) {
    sheet = ss.insertSheet('キャンセル待ち');
    var headers = ['日付', 'スタジオ', '時間', 'クラス', 'ニックネーム', 'メール', '登録日時'];
    var range = sheet.getRange(1, 1, 1, headers.length);
    range.setValues([headers]);
    range.setFontWeight('bold');
    range.setBackground('#4285f4');
    range.setFontColor('#ffffff');
  }
  return sheet;
}

// ===== 現在の予約数と定員を取得（スケジュール優先→定期レッスン。max 0=無制限） =====
function getLessonOccupancy(date, studio, time, className) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var key = date + '|' + studio + '|' + time + '|' + className;

  var current = 0;
  var bookingData = getAllBookingRows();
  for (var i = 0; i < bookingData.length; i++) {
    var row = bookingData[i];
    if (formatDate(row[0]) + '|' + row[1] + '|' + row[2] + '|' + row[3] === key) current++;
  }

  var max = 10;
  var found = false;
  var scheduleSheet = ss.getSheetByName('スケジュール');
  if (scheduleSheet) {
    var scheduleData = scheduleSheet.getDataRange().getValues();
    for (var i = 1; i < scheduleData.length; i++) {
      var row = scheduleData[i];
      if (formatDate(row[0]) + '|' + row[1] + '|' + row[2] + '|' + row[3] === key) {
        max = (row[4] !== '' && row[4] != null) ? parseInt(row[4]) : 10;
        found = true;
        break;
      }
    }
  }
  if (!found) {
    var regRow = matchRegularLesson(getRegularLessonData(), date, studio, time, className);
    if (regRow !== null) max = (regRow[7] !== '' && regRow[7] != null) ? parseInt(regRow[7]) : 0;
  }
  var capOverride = findCapacityOverride(date, studio, time, className);
  if (capOverride !== null) max = capOverride;
  return { current: current, max: max };
}

// ===== キャンセル待ち登録（満員レッスンのみ・メール必須） =====
function joinWaitlist(params) {
  var date = params.date || '';
  var studio = params.studio || '';
  var time = params.time || '';
  var className = params.class_name || '';
  var name = String(params.name || '').trim();
  var email = String(params.email || '').trim();

  if (!name) return jsonResponse({ success: false, error: 'ニックネームを入力してください' });
  if (!email) return jsonResponse({ success: false, error: '空き通知の送信先メールアドレスを入力してください' });

  var occ = getLessonOccupancy(date, studio, time, className);
  if (occ.max === 0 || occ.current < occ.max) {
    return jsonResponse({ success: false, error: '現在このレッスンには空きがあります。そのままご予約ください' });
  }

  var sheet = getWaitlistSheet();
  var key = date + '|' + studio + '|' + time + '|' + className;
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var rowKey = formatDate(row[0]) + '|' + row[1] + '|' + row[2] + '|' + row[3];
    if (rowKey === key && (String(row[4] || '').trim() === name || String(row[5] || '').trim().toLowerCase() === email.toLowerCase())) {
      return jsonResponse({ success: false, error: '既にこのレッスンのキャンセル待ちに登録済みです' });
    }
  }

  sheet.appendRow([date, studio, time, className, name, email, new Date()]);
  sendWaitlistConfirmation(email, date, studio, time, className, name);
  return jsonResponse({ success: true, message: 'キャンセル待ちに登録しました' });
}

// ===== キャンセル発生時: 空きが出ていればキャンセル待ち全員へ通知して登録解除（予約は先着順） =====
function notifyWaitlistIfVacancy(date, studio, time, className) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('キャンセル待ち');
    if (!sheet || sheet.getLastRow() <= 1) return;

    var parts = String(date).split('/');
    if (parts.length === 3) {
      var lessonDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      var today = new Date();
      today.setHours(0, 0, 0, 0);
      if (lessonDate < today) return;
    }

    // Home-studio priority can overbook; only notify when a spot is actually open
    var occ = getLessonOccupancy(date, studio, time, className);
    if (occ.max > 0 && occ.current >= occ.max) return;

    var key = date + '|' + studio + '|' + time + '|' + className;
    var data = sheet.getDataRange().getValues();
    var notified = [];
    for (var i = data.length - 1; i >= 1; i--) {
      var row = data[i];
      var rowKey = formatDate(row[0]) + '|' + row[1] + '|' + row[2] + '|' + row[3];
      if (rowKey !== key) continue;
      var email = String(row[5] || '').trim();
      var name = String(row[4] || '').trim();
      if (email) notified.push({ email: email, name: name });
      sheet.deleteRow(i + 1);
    }
    notified.forEach(function(w) {
      sendWaitlistVacancyEmail(w.email, date, studio, time, className, w.name);
    });
  } catch (e) {
    Logger.log('キャンセル待ち通知エラー: ' + e.message);
  }
}

// ===== キャンセル待ち受付メール（登録者宛） =====
function sendWaitlistConfirmation(email, date, studio, time, className, name) {
  try {
    var subject = '【BEAT THE MIX】キャンセル待ち受付 — ' + date + ' ' + className;
    var body = name + ' 様\n\n'
      + '以下のレッスンのキャンセル待ちを受け付けました。\n\n'
      + '━━━━━━━━━━━━━━━━━━━━\n'
      + '日付: ' + date + '\n'
      + 'スタジオ: ' + studio + '\n'
      + '時間: ' + time + '\n'
      + 'クラス: ' + className + '\n'
      + '━━━━━━━━━━━━━━━━━━━━\n\n'
      + '空きが出ましたら、このメールアドレスにお知らせします。\n'
      + '※通知後のご予約は先着順です（自動では予約されません）。\n\n'
      + 'BEAT THE MIX ダンススタジオ\n\n'
      + '─────────────────────\n'
      + '※このメールは送信専用です。\n'
      + '　このメールに返信しても届きませんので\n'
      + '　ご了承ください。';
    GmailApp.sendEmail(email, subject, body);
  } catch (e) {
    Logger.log('キャンセル待ち受付メール送信エラー: ' + e.message);
  }
}

// ===== 空き発生通知メール（キャンセル待ち登録者宛） =====
function sendWaitlistVacancyEmail(email, date, studio, time, className, name) {
  try {
    var subject = '【BEAT THE MIX】空きが出ました — ' + date + ' ' + className;
    var body = name + ' 様\n\n'
      + 'キャンセル待ちいただいていた以下のレッスンに空きが出ました。\n\n'
      + '━━━━━━━━━━━━━━━━━━━━\n'
      + '日付: ' + date + '\n'
      + 'スタジオ: ' + studio + '\n'
      + '時間: ' + time + '\n'
      + 'クラス: ' + className + '\n'
      + '━━━━━━━━━━━━━━━━━━━━\n\n'
      + 'ご希望の場合は、会員ページからご予約ください（先着順）。\n'
      + 'https://tibadance.com/members-page\n\n'
      + '※この通知をもってキャンセル待ちの登録は解除されます。\n'
      + '　再び満員になった場合は、お手数ですが再度キャンセル待ちにご登録ください。\n\n'
      + 'BEAT THE MIX ダンススタジオ\n\n'
      + '─────────────────────\n'
      + '※このメールは送信専用です。\n'
      + '　このメールに返信しても届きませんので\n'
      + '　ご了承ください。';
    GmailApp.sendEmail(email, subject, body);
  } catch (e) {
    Logger.log('空き通知メール送信エラー: ' + e.message);
  }
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

  var category = params.category || '';
  sheet.appendRow([date, title, content, importance, imageIds.join(','), category]);
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

// ===== 管理者: お知らせ編集 =====
function adminEditAnnouncement(params) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('お知らせ');
  if (!sheet) return jsonResponse({ success: false, error: 'シートがありません' });

  var row = parseInt(params.row);
  if (!row || row < 2) return jsonResponse({ success: false, error: '無効な行番号です' });
  if (row > sheet.getLastRow()) return jsonResponse({ success: false, error: '該当する行がありません' });

  if (params.title) sheet.getRange(row, 2).setValue(params.title);
  if (params.content !== undefined) sheet.getRange(row, 3).setValue(params.content);
  if (params.importance !== undefined) sheet.getRange(row, 4).setValue(params.importance);

  return jsonResponse({ success: true, message: 'お知らせを更新しました' });
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

  var frequency = params.frequency || 'weekly';
  var startDate = params.startDate || '';
  var max = (params.max !== undefined && params.max !== '') ? parseInt(params.max) : '';
  var periodStart = params.periodStart || '';
  var periodEnd = params.periodEnd || '';

  if (periodStart || periodEnd) ensureRegularPeriodColumns(sheet);
  sheet.appendRow([dayOfWeek, studio, time, className, category, frequency, startDate, max, periodStart, periodEnd]);
  return jsonResponse({ success: true, message: '定期レッスンを追加しました' });
}

// ===== 定期レッスンシートに期間列（I:期間開始/J:期間終了）を確保 =====
function ensureRegularPeriodColumns(sheet) {
  if (sheet.getMaxColumns() < 10) sheet.insertColumnsAfter(sheet.getMaxColumns(), 10 - sheet.getMaxColumns());
  if (String(sheet.getRange(1, 9).getValue() || '') === '') sheet.getRange(1, 9).setValue('期間開始');
  if (String(sheet.getRange(1, 10).getValue() || '') === '') sheet.getRange(1, 10).setValue('期間終了');
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
  if (params.max !== undefined) {
    sheet.getRange(row, 8).setValue(params.max === '' ? '' : parseInt(params.max));
  }
  // 期間設定（パラメータ未送信=単発編集時は既存値を維持）
  if (params.periodStart !== undefined || params.periodEnd !== undefined) {
    ensureRegularPeriodColumns(sheet);
    sheet.getRange(row, 9, 1, 2).setValues([[params.periodStart || '', params.periodEnd || '']]);
  }
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

// ===== 定期休み取得 =====
function getRegularHolidays() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('定期休み');
  if (!sheet || sheet.getLastRow() <= 1) return jsonResponse([]);

  var data = sheet.getDataRange().getValues();
  var items = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;
    items.push({
      id: i + 1,
      day: String(row[0]),
      studio: String(row[1] || ''),
      category: String(row[2] || '')
    });
  }
  return jsonResponse(items);
}

// ===== 管理者: 定期休み追加 =====
function adminAddRegularHoliday(params) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('定期休み');
  if (!sheet) return jsonResponse({ success: false, error: '定期休みシートがありません' });

  var day = params.day || '';
  var studio = params.studio || '';
  var category = params.category || '';

  if (!day) return jsonResponse({ success: false, error: '曜日は必須です' });

  sheet.appendRow([day, studio, category]);
  return jsonResponse({ success: true, message: '定期休みを追加しました' });
}

// ===== 管理者: 定期休み削除 =====
function adminDeleteRegularHoliday(params) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('定期休み');
  if (!sheet) return jsonResponse({ success: false, error: 'シートがありません' });

  var id = parseInt(params.id);
  if (!id || id < 2) return jsonResponse({ success: false, error: '無効な行番号です' });
  if (id > sheet.getLastRow()) return jsonResponse({ success: false, error: '該当する行がありません' });

  sheet.deleteRow(id);
  return jsonResponse({ success: true, message: '削除しました' });
}

// ===== 管理者: お知らせピン留めトグル =====
function adminTogglePinAnnouncement(params) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('お知らせ');
  if (!sheet) return jsonResponse({ success: false, error: 'シートがありません' });

  var id = parseInt(params.id);
  if (!id || id < 2) return jsonResponse({ success: false, error: '無効な行番号です' });
  if (id > sheet.getLastRow()) return jsonResponse({ success: false, error: '該当する行がありません' });

  var cell = sheet.getRange(id, 7); // 7th column = ピン留め
  var current = String(cell.getValue()).toUpperCase();
  var newValue = (current === 'TRUE') ? 'FALSE' : 'TRUE';
  cell.setValue(newValue);
  return jsonResponse({ success: true, message: 'ピン留めを' + (newValue === 'TRUE' ? '設定' : '解除') + 'しました', pinned: newValue === 'TRUE' });
}

// ===== 臨時キャンセル取得 =====
function getLessonCancels() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('臨時キャンセル');
  if (!sheet || sheet.getLastRow() <= 1) return jsonResponse([]);

  var data = sheet.getDataRange().getValues();
  var items = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;
    items.push({
      date: formatDate(row[0]),
      studio: String(row[1] || ''),
      time: String(row[2] || ''),
      class_name: String(row[3] || ''),
      category: String(row[4] || ''),
      row: i + 1
    });
  }
  return jsonResponse(items);
}

// ===== 管理者: 臨時キャンセル追加 =====
function adminAddLessonCancel(params) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('臨時キャンセル');
  if (!sheet) return jsonResponse({ success: false, error: '臨時キャンセルシートがありません' });

  var date = params.date || '';
  var studio = params.studio || '';
  var time = params.time || '';
  var className = params.class_name || '';
  var category = params.category || '';

  if (!date) return jsonResponse({ success: false, error: '日付は必須です' });

  sheet.appendRow([date, studio, time, className, category]);
  return jsonResponse({ success: true, message: '臨時キャンセルを追加しました' });
}

// ===== 管理者: 臨時キャンセル削除 =====
function adminDeleteLessonCancel(params) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('臨時キャンセル');
  if (!sheet) return jsonResponse({ success: false, error: 'シートがありません' });

  var row = parseInt(params.row);
  if (!row || row < 2) return jsonResponse({ success: false, error: '無効な行番号です' });
  if (row > sheet.getLastRow()) return jsonResponse({ success: false, error: '該当する行がありません' });

  sheet.deleteRow(row);
  return jsonResponse({ success: true, message: '削除しました' });
}

// ===== 臨時メモ取得 =====
function getLessonNotes() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('臨時メモ');
  if (!sheet || sheet.getLastRow() <= 1) return jsonResponse([]);

  var data = sheet.getDataRange().getValues();
  var items = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;
    items.push({
      date: formatDate(row[0]),
      studio: String(row[1] || ''),
      time: String(row[2] || ''),
      memo: String(row[3] || ''),
      category: String(row[4] || ''),
      row: i + 1
    });
  }
  return jsonResponse(items);
}

// ===== 管理者: 臨時メモ追加 =====
function adminAddLessonNote(params) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('臨時メモ');
  if (!sheet) return jsonResponse({ success: false, error: '臨時メモシートがありません' });

  var date = params.date || '';
  var studio = params.studio || '';
  var time = params.time || '';
  var memo = params.memo || '';
  var category = params.category || '';

  if (!date) return jsonResponse({ success: false, error: '日付は必須です' });
  if (!memo) return jsonResponse({ success: false, error: 'メモ内容は必須です' });

  sheet.appendRow([date, studio, time, memo, category]);
  return jsonResponse({ success: true, message: '臨時メモを追加しました' });
}

// ===== 管理者: 臨時メモ削除 =====
function adminDeleteLessonNote(params) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('臨時メモ');
  if (!sheet) return jsonResponse({ success: false, error: 'シートがありません' });

  var row = parseInt(params.row);
  if (!row || row < 2) return jsonResponse({ success: false, error: '無効な行番号です' });
  if (row > sheet.getLastRow()) return jsonResponse({ success: false, error: '該当する行がありません' });

  sheet.deleteRow(row);
  return jsonResponse({ success: true, message: '削除しました' });
}

// ===== 臨時定員シート取得（無ければ作成・再デプロイのみでOK） =====
function getCapacityOverrideSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('臨時定員');
  if (!sheet) {
    sheet = ss.insertSheet('臨時定員');
    var headers = ['日付', 'スタジオ', '時間', 'クラス', '定員', 'category'];
    var range = sheet.getRange(1, 1, 1, headers.length);
    range.setValues([headers]);
    range.setFontWeight('bold');
    range.setBackground('#4285f4');
    range.setFontColor('#ffffff');
  }
  return sheet;
}

// ===== 臨時定員取得 =====
function getCapacityOverrides() {
  var sheet = getCapacityOverrideSheet();
  if (sheet.getLastRow() <= 1) return jsonResponse([]);

  var data = sheet.getDataRange().getValues();
  var items = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;
    items.push({
      date: formatDate(row[0]),
      studio: String(row[1] || ''),
      time: String(row[2] || ''),
      class_name: String(row[3] || ''),
      max: (row[4] !== '' && row[4] != null) ? parseInt(row[4]) : 0,
      category: String(row[5] || ''),
      row: i + 1
    });
  }
  return jsonResponse(items);
}

// ===== 臨時定員を検索（該当日だけの定員上書き。無ければnull、0=無制限） =====
function findCapacityOverride(date, studio, time, className) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('臨時定員');
  if (!sheet || sheet.getLastRow() <= 1) return null;

  var key = date + '|' + studio + '|' + time + '|' + className;
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (formatDate(row[0]) + '|' + row[1] + '|' + row[2] + '|' + row[3] === key) {
      return (row[4] !== '' && row[4] != null) ? parseInt(row[4]) : 0;
    }
  }
  return null;
}

// ===== 管理者: 臨時定員追加（同キー既存なら定員だけ更新） =====
function adminAddCapacityOverride(params) {
  var sheet = getCapacityOverrideSheet();

  var date = params.date || '';
  var studio = params.studio || '';
  var time = params.time || '';
  var className = params.class_name || '';
  var category = params.category || '';
  var max = parseInt(params.max);

  if (!date) return jsonResponse({ success: false, error: '日付は必須です' });
  if (isNaN(max) || max < 0) return jsonResponse({ success: false, error: '定員は0以上の数字で指定してください' });

  var key = date + '|' + studio + '|' + time + '|' + className;
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (formatDate(row[0]) + '|' + row[1] + '|' + row[2] + '|' + row[3] === key) {
      sheet.getRange(i + 1, 5).setValue(max);
      return jsonResponse({ success: true, message: 'この日の定員を更新しました' });
    }
  }

  sheet.appendRow([date, studio, time, className, max, category]);
  return jsonResponse({ success: true, message: 'この日の定員を設定しました' });
}

// ===== 管理者: 臨時定員削除 =====
function adminDeleteCapacityOverride(params) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('臨時定員');
  if (!sheet) return jsonResponse({ success: false, error: 'シートがありません' });

  var row = parseInt(params.row);
  if (!row || row < 2) return jsonResponse({ success: false, error: '無効な行番号です' });
  if (row > sheet.getLastRow()) return jsonResponse({ success: false, error: '該当する行がありません' });

  sheet.deleteRow(row);
  return jsonResponse({ success: true, message: '削除しました' });
}

// ===== 不定休取得 =====
function getIrregularHolidays() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('不定休');
  if (!sheet || sheet.getLastRow() <= 1) return jsonResponse([]);

  var data = sheet.getDataRange().getValues();
  var items = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;
    items.push({
      date: formatDate(row[0]),
      reason: String(row[1] || ''),
      category: String(row[2] || ''),
      row: i + 1
    });
  }
  return jsonResponse(items);
}

// ===== 管理者: 不定休追加 =====
function adminAddIrregularHoliday(params) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('不定休');
  if (!sheet) return jsonResponse({ success: false, error: '不定休シートがありません' });

  var date = params.date || '';
  var reason = params.reason || '';
  var category = params.category || '';

  if (!date) return jsonResponse({ success: false, error: '日付は必須です' });

  sheet.appendRow([date, reason, category]);
  return jsonResponse({ success: true, message: '不定休を追加しました' });
}

// ===== 管理者: 不定休削除 =====
function adminDeleteIrregularHoliday(params) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('不定休');
  if (!sheet) return jsonResponse({ success: false, error: 'シートがありません' });

  var row = parseInt(params.row);
  if (!row || row < 2) return jsonResponse({ success: false, error: '無効な行番号です' });
  if (row > sheet.getLastRow()) return jsonResponse({ success: false, error: '該当する行がありません' });

  sheet.deleteRow(row);
  return jsonResponse({ success: true, message: '削除しました' });
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
