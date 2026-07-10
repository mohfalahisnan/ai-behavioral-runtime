import http from "http";
import { URL } from "url";

export interface WebhookPayload {
  readonly paneKey?: string;
  readonly launchToken?: string;
  readonly tabId?: string;
  readonly worktreeId?: string;
  readonly env?: string;
  readonly version?: string;
  readonly hook_event_name: string;
  readonly payload: any;
}

export type WebhookCallback = (data: WebhookPayload) => Promise<any>;

export class AntigravityHookServer {
  readonly #server: http.Server;
  #activeServer: http.Server | undefined;
  readonly #callback: WebhookCallback;

  constructor(callback: WebhookCallback) {
    this.#callback = callback;
    this.#server = http.createServer((req, res) => this.#handleRequest(req, res));
  }

  async start(port: number): Promise<void> {
    if (this.#activeServer) return;
    return new Promise<void>((resolve, reject) => {
      this.#server.listen(port, "127.0.0.1", () => {
        this.#activeServer = this.#server;
        resolve();
      });
      this.#server.on("error", (err) => {
        reject(err);
      });
    });
  }

  async stop(): Promise<void> {
    if (!this.#activeServer) return;
    return new Promise<void>((resolve, reject) => {
      this.#activeServer?.close((err) => {
        if (err) reject(err);
        else {
          this.#activeServer = undefined;
          resolve();
        }
      });
    });
  }

  #handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    const url = new URL(req.url ?? "", `http://${req.headers.host ?? "localhost"}`);
    if (req.method === "POST" && url.pathname === "/hook/antigravity") {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", () => {
        try {
          const payload = JSON.parse(body) as WebhookPayload;
          
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ status: "acknowledged" }));

          // Execute callback asynchronously
          this.#callback(payload).catch((err) => {
            console.error("Error executing hook callback:", err);
          });
        } catch (err) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid JSON payload" }));
        }
      });
    } else {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not Found" }));
    }
  }
}
