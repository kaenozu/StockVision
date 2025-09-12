"""
ドキュメント品質管理のWebインターフェース

FastAPIを使用したWebアプリケーション
"""

import json
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import (BackgroundTasks, FastAPI, File,  # Moved from bottom
                     HTTPException, UploadFile, WebSocket, WebSocketDisconnect)
from fastapi.requests import Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel

from .quality_manager import QualityManager

app = FastAPI(title="Document Quality Manager", version="1.0.0")

# 静的ファイルとテンプレート設定
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# グローバル品質管理インスタンス
quality_manager = QualityManager()


class AnalysisRequest(BaseModel):
    content: str
    file_path: Optional[str] = "untitled.md"


class RulesUpdate(BaseModel):
    rules: Dict[str, Any]


class DirectoryAnalysisRequest(BaseModel):
    directory_path: str
    file_patterns: Optional[List[str]] = None


@app.get("/", response_class=HTMLResponse)
async def dashboard(request: Request):
    """ダッシュボード表示"""
    return templates.TemplateResponse("dashboard.html", {"request": request})


@app.post("/api/analyze")
async def analyze_document(request: AnalysisRequest):
    """単一ドキュメント分析API"""
    try:
        report = await quality_manager.analyze_document(
            request.file_path, request.content
        )
        return {
            "status": "success",
            "report": json.loads(quality_manager.export_report(report, "json")),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/analyze-file")
async def analyze_uploaded_file(file: UploadFile = File(...)):
    """アップロードファイル分析API"""
    try:
        content = await file.read()
        content_str = content.decode("utf-8")

        report = await quality_manager.analyze_document(
            file.filename or "uploaded_file", content_str
        )

        return {
            "status": "success",
            "filename": file.filename,
            "report": json.loads(quality_manager.export_report(report, "json")),
        }
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File encoding not supported")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/analyze-directory")
async def analyze_directory(
    background_tasks: BackgroundTasks, request: DirectoryAnalysisRequest
):
    """ディレクトリ分析API"""
    try:
        if not Path(request.directory_path).exists():
            raise HTTPException(status_code=404, detail="Directory not found")

        # バックグラウンドでディレクトリ分析を実行
        background_tasks.add_task(
            _analyze_directory_background,
            request.directory_path,
            request.file_patterns or ["*.md", "*.rst", "*.txt"],
        )

        return {
            "status": "started",
            "message": "Directory analysis started in background",
            "directory": request.directory_path,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def _analyze_directory_background(directory_path: str, file_patterns: List[str]):
    """ディレクトリ分析バックグラウンドタスク"""
    try:
        reports = await quality_manager.analyze_directory(directory_path, file_patterns)
        summary = quality_manager.generate_summary_report(reports)

        # 結果をファイルに保存（実際のアプリではデータベースに保存）
        results_dir = Path("analysis_results")
        results_dir.mkdir(exist_ok=True)

        result_file = results_dir / f"analysis_{Path(directory_path).name}.json"
        with open(result_file, "w", encoding="utf-8") as f:
            json.dump(
                {
                    "summary": summary,
                    "reports": [
                        json.loads(quality_manager.export_report(report, "json"))
                        for report in reports
                    ],
                },
                f,
                indent=2,
                ensure_ascii=False,
            )

        print(f"Analysis complete. Results saved to {result_file}")
    except Exception as e:
        print(f"Background analysis error: {e}")


@app.get("/api/reports")
async def get_reports():
    """保存されたレポート一覧取得"""
    try:
        results_dir = Path("analysis_results")
        if not results_dir.exists():
            return {"reports": []}

        reports = []
        for file_path in results_dir.glob("*.json"):
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    reports.append(
                        {
                            "id": file_path.stem,
                            "name": file_path.stem.replace("analysis_", ""),
                            "created": file_path.stat().st_mtime,
                            "summary": data.get("summary", {}),
                        }
                    )
            except Exception:
                continue

        return {"reports": sorted(reports, key=lambda x: x["created"], reverse=True)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/reports/{report_id}")
async def get_report_detail(report_id: str):
    """詳細レポート取得"""
    try:
        results_dir = Path("analysis_results")
        report_file = results_dir / f"{report_id}.json"

        if not report_file.exists():
            raise HTTPException(status_code=404, detail="Report not found")

        with open(report_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        return data
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Report not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/rules")
async def get_rules():
    """現在のルール取得"""
    return {"rules": quality_manager.rules.rules}


@app.post("/api/rules")
async def update_rules(request: RulesUpdate):
    """ルール更新"""
    try:
        quality_manager.rules.update_rules(request.rules)
        return {
            "status": "success",
            "message": "Rules updated successfully",
            "rules": quality_manager.rules.rules,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/metrics/{file_path:path}")
async def get_file_metrics(file_path: str):
    """特定ファイルのメトリクス履歴取得"""
    try:
        if file_path not in quality_manager.reports_history:
            return {"metrics": []}

        reports = quality_manager.reports_history[file_path]
        metrics_history = []

        for report in reports:
            metrics_history.append(
                {
                    "timestamp": report.timestamp.isoformat(),
                    "overall_score": report.metrics.overall_score,
                    "readability_score": report.metrics.readability_score,
                    "word_count": report.metrics.word_count,
                    "issues_count": len(report.issues),
                    "quality_level": report.metrics.quality_level.value,
                }
            )

        return {"metrics": metrics_history}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/health")
async def health_check():
    """ヘルスチェック"""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "reports_count": sum(
            len(reports) for reports in quality_manager.reports_history.values()
        ),
    }


# WebSocket接続（リアルタイム分析結果用）


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)


manager = ConnectionManager()


@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: int):
    """WebSocket接続エンドポイント"""
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # リアルタイム分析ロジック
            try:
                analysis_request = json.loads(data)
                content = analysis_request.get("content", "")
                file_path = analysis_request.get("file_path", "realtime.md")

                if content.strip():
                    report = await quality_manager.analyze_document(file_path, content)
                    result = {
                        "type": "analysis_result",
                        "data": json.loads(
                            quality_manager.export_report(report, "json")
                        ),
                    }
                    await manager.send_personal_message(json.dumps(result), websocket)
            except Exception as e:
                error_msg = {"type": "error", "message": str(e)}
                await manager.send_personal_message(json.dumps(error_msg), websocket)

    except WebSocketDisconnect:
        manager.disconnect(websocket)


if __name__ == "__main__":
    import uvicorn

    # 必要なディレクトリを作成
    Path("analysis_results").mkdir(exist_ok=True)
    Path("static").mkdir(exist_ok=True)
    Path("templates").mkdir(exist_ok=True)

    uvicorn.run(app, host="0.0.0.0", port=8000)
