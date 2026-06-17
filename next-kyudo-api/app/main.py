from fastapi import FastAPI

# アプリケーションの初期化
app = FastAPI(
    title="Kyudo Tournament API",
    description="弓道大会運営システム用バックエンドAPI",
    version="1.0.0"
)

@app.get("/")
def read_root():
    """
    APIのヘルスチェック用エンドポイント
    """
    return {
        "status": "success",
        "message": "Kyudo Tournament API is running successfully."
    }