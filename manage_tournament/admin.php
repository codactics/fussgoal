<?php
// backend.php  (single-file backend + admin panel)
// REQUIREMENT: PHP hosting (XAMPP/WAMP/shared hosting). Not for "open .html directly" usage.

session_start();

define('ADMIN_USER', 'admin');           // change
define('ADMIN_PASS', 'change-me-123');   // change

$dataFile = __DIR__ . '/data.json';

function loadData($file) {
    if (!file_exists($file)) {
        $empty = ["teams"=>[], "fixtures"=>[], "scores"=>[]];
        file_put_contents($file, json_encode($empty, JSON_PRETTY_PRINT));
        return $empty;
    }
    $raw = file_get_contents($file);
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        $data = ["teams"=>[], "fixtures"=>[], "scores"=>[]];
    }
    // Ensure keys exist
    foreach (["teams","fixtures","scores"] as $k) {
        if (!isset($data[$k]) || !is_array($data[$k])) $data[$k] = [];
    }
    return $data;
}

function saveData($file, $data) {
    file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT));
}

function isAdmin() {
    return !empty($_SESSION['is_admin']);
}

function jsonResponse($arr, $code = 200) {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($arr);
    exit;
}

$action = $_GET['action'] ?? '';

/**
 * PUBLIC API (your website calls this)
 * GET backend.php?action=get_data
 */
if ($action === 'get_data') {
    $data = loadData($dataFile);
    jsonResponse(["ok" => true, "data" => $data]);
}

/**
 * ADMIN API (admin panel calls these)
 */
if ($action === 'login' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $u = $_POST['username'] ?? '';
    $p = $_POST['password'] ?? '';
    if ($u === ADMIN_USER && $p === ADMIN_PASS) {
        $_SESSION['is_admin'] = true;
        header("Location: backend.php");
        exit;
    }
    $loginError = "Invalid username or password.";
}

if ($action === 'logout') {
    session_destroy();
    header("Location: backend.php");
    exit;
}

if ($action === 'save' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!isAdmin()) jsonResponse(["ok"=>false, "error"=>"Unauthorized"], 401);

    $payload = $_POST['payload'] ?? '';
    $decoded = json_decode($payload, true);

    if (!is_array($decoded)) {
        jsonResponse(["ok"=>false, "error"=>"Payload must be valid JSON."], 400);
    }

    // Normalize structure
    foreach (["teams","fixtures","scores"] as $k) {
        if (!isset($decoded[$k]) || !is_array($decoded[$k])) $decoded[$k] = [];
    }

    saveData($dataFile, $decoded);
    jsonResponse(["ok"=>true]);
}

/**
 * ADMIN PANEL UI (HTML)
 */
$data = loadData($dataFile);
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Admin - ScoreBoard</title>
  <style>
    body{font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px}
    .box{max-width:900px;margin:0 auto;background:#fff;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,.1);padding:20px}
    input,button,textarea{font:inherit}
    input{padding:10px;width:100%;margin:8px 0}
    textarea{width:100%;height:360px;padding:12px;line-height:1.4}
    button{padding:10px 14px;cursor:pointer}
    .row{display:flex;gap:10px;align-items:center;justify-content:space-between}
    .muted{color:#666}
    .error{color:#b00020}
    .ok{color:#0a7a0a}
  </style>
</head>
<body>
  <div class="box">
    <div class="row">
      <h2 style="margin:0">ScoreBoard Admin</h2>
      <?php if (isAdmin()): ?>
        <a href="backend.php?action=logout">Logout</a>
      <?php endif; ?>
    </div>

    <?php if (!isAdmin()): ?>
      <p class="muted">Login to manage Teams / Fixtures / Scores.</p>
      <?php if (!empty($loginError)): ?>
        <p class="error"><?= htmlspecialchars($loginError) ?></p>
      <?php endif; ?>
      <form method="post" action="backend.php?action=login">
        <label>Username</label>
        <input name="username" autocomplete="username" />
        <label>Password</label>
        <input name="password" type="password" autocomplete="current-password" />
        <button type="submit">Login</button>
      </form>
    <?php else: ?>
      <p class="muted">
        Edit the JSON below and click <b>Save</b>. Your public site will read this data via:
        <code>backend.php?action=get_data</code>
      </p>

      <form id="saveForm">
        <textarea name="payload" id="payload"><?= htmlspecialchars(json_encode($data, JSON_PRETTY_PRINT)) ?></textarea>
        <div class="row" style="margin-top:10px">
          <button type="submit">Save</button>
          <span id="status" class="muted"></span>
        </div>
      </form>

      <hr />
      <p class="muted"><b>Example structure</b></p>
      <pre class="muted" style="white-space:pre-wrap;margin:0">
{
  "teams": [{"name":"Team A"},{"name":"Team B"}],
  "fixtures": [{"home":"Team A","away":"Team B","date":"2026-02-10"}],
  "scores": [{"home":"Team A","away":"Team B","homeGoals":2,"awayGoals":1}]
}
      </pre>

      <script>
        const form = document.getElementById('saveForm');
        const statusEl = document.getElementById('status');

        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          statusEl.textContent = 'Saving...';

          const fd = new FormData(form);

          // quick client-side JSON validation
          try { JSON.parse(fd.get('payload')); }
          catch { statusEl.textContent = '❌ Invalid JSON'; return; }

          const res = await fetch('backend.php?action=save', { method: 'POST', body: fd });
          const json = await res.json().catch(() => ({}));

          if (res.ok && json.ok) statusEl.textContent = '✅ Saved';
          else statusEl.textContent = '❌ ' + (json.error || 'Save failed');
        });
      </script>
    <?php endif; ?>
  </div>
</body>
</html>
