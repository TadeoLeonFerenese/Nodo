use std::thread;
use tauri::Emitter;
use tiny_http::{Server, Response, Header, Method};

#[tauri::command]
fn get_local_ip() -> Result<String, String> {
  local_ip_address::local_ip()
    .map(|ip| ip.to_string())
    .map_err(|e| e.to_string())
}

fn start_http_server(app_handle: tauri::AppHandle) {
  thread::spawn(move || {
    let server = match Server::http("0.0.0.0:4545") {
      Ok(s) => s,
      Err(e) => {
        eprintln!("Failed to bind HTTP server on port 4545: {}", e);
        return;
      }
    };

    println!("Nodo Local Sync Server running on http://0.0.0.0:4545");

    let cors_origin = Header::from_bytes(&b"Access-Control-Allow-Origin"[..], &b"*"[..]).unwrap();
    let cors_methods = Header::from_bytes(&b"Access-Control-Allow-Methods"[..], &b"GET, POST, OPTIONS"[..]).unwrap();
    let cors_headers = Header::from_bytes(&b"Access-Control-Allow-Headers"[..], &b"Content-Type, Authorization"[..]).unwrap();
    let content_type_json = Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap();

    for mut request in server.incoming_requests() {
      if request.method() == &Method::Options {
        let response = Response::empty(200)
          .with_header(cors_origin.clone())
          .with_header(cors_methods.clone())
          .with_header(cors_headers.clone());
        let _ = request.respond(response);
        continue;
      }

      let url = request.url().to_string();
      let path = url.split('?').next().unwrap_or("");

      match (request.method(), path) {
        (&Method::Get, "/api/ping") => {
          let body = r#"{"status":"nodo-online","version":"0.1.0"}"#;
          let response = Response::from_string(body)
            .with_header(cors_origin.clone())
            .with_header(content_type_json.clone());
          let _ = request.respond(response);
        }
        (&Method::Post, "/api/sync/push") => {
          let mut content = String::new();
          if request.as_reader().read_to_string(&mut content).is_ok() {
            let _ = app_handle.emit("sync-batch-received", content);
            let body = r#"{"status":"success","message":"Batch received"}"#;
            let response = Response::from_string(body)
              .with_header(cors_origin.clone())
              .with_header(content_type_json.clone());
            let _ = request.respond(response);
          } else {
            let response = Response::from_string(r#"{"status":"error","message":"Invalid body"}"#)
              .with_status_code(400)
              .with_header(cors_origin.clone())
              .with_header(content_type_json.clone());
            let _ = request.respond(response);
          }
        }
        _ => {
          let response = Response::from_string(r#"{"status":"not_found"}"#)
            .with_status_code(404)
            .with_header(cors_origin.clone())
            .with_header(content_type_json.clone());
          let _ = request.respond(response);
        }
      }
    }
  });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_sql::Builder::default().build())
    .invoke_handler(tauri::generate_handler![get_local_ip])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      let handle = app.handle().clone();
      start_http_server(handle);

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
