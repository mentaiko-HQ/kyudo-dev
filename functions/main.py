import json
from firebase_functions import https_fn, options # ★ options をインポート
from firebase_admin import initialize_app, firestore, messaging

# Firebase Admin SDK の初期化
initialize_app()

# ==========================================
# Cloud Functions API エンドポイント
# ==========================================
# カッコの中を完全に空（または引数なし）にします。これでライブラリのバグを完全にすり抜けます！
@https_fn.on_request()
def call_teams(req: https_fn.Request) -> https_fn.Response:
    # 1. CORSプリフライト（OPTIONSリクエスト）のハンドリング
    if req.method == "OPTIONS":
        return https_fn.Response("OK", status=200)

    # 2. メソッドの制限（POSTのみを許可）
    if req.method != "POST":
        return https_fn.Response(
            json.dumps({"status": "error", "message": "Method not allowed. Use POST."}),
            status=405,
            mimetype="application/json"
        )

    # 3. リクエストデータ（JSON）の解析と検証
    try:
        request_json = req.get_json(silent=True)
        if not request_json:
            return https_fn.Response(
                json.dumps({"status": "error", "message": "Invalid JSON payload."}),
                status=400,
                mimetype="application/json"
            )

        team_ids = request_json.get("teamIds", [])
        tachi_number = request_json.get("tachiNumber")

        if not isinstance(team_ids, list) or tachi_number is None:
            return https_fn.Response(
                json.dumps({
                    "status": "error",
                    "message": "Missing or invalid parameters. 'teamIds' (list) and 'tachiNumber' (int) are required."
                }),
                status=400,
                mimetype="application/json"
            )

    except Exception as e:
        print(f"Error parsing request payload: {e}")
        return https_fn.Response(
            json.dumps({"status": "error", "message": "Internal request processing error."}),
            status=400,
            mimetype="application/json"
        )

    if not team_ids:
        return https_fn.Response(
            json.dumps({"status": "skipped", "message": "No teams to notify.", "notifiedCount": 0}),
            status=200,
            mimetype="application/json"
        )

    # 4. Firestore からユーザーの FCMトークン を検索
    db = firestore.client()
    target_tokens = []

    try:
        users_ref = db.collection("users")
        query = users_ref.where("selectedTeamId", "in", team_ids).stream()

        for user_doc in query:
            user_data = user_doc.to_dict()
            token = user_data.get("fcmToken")
            if token:
                target_tokens.append(token)

    except Exception as e:
        print(f"Firestore query failed: {e}")
        return https_fn.Response(
            json.dumps({"status": "error", "message": "Failed to fetch users from database."}),
            status=500,
            mimetype="application/json"
        )

    if not target_tokens:
        return https_fn.Response(
            json.dumps({
                "status": "success",
                "message": "No registered devices found for the given teams.",
                "notifiedCount": 0
            }),
            status=200,
            mimetype="application/json"
        )

    # 5. プッシュ通知メッセージの構築と一斉送信
    message = messaging.MulticastMessage(
        notification=messaging.Notification(
            title="【弓道大会 呼出】",
            body=f"第{tachi_number}立の皆様、2つ前の立ちが開始されました。速やかに召集所へお集まりください。",
        ),
        tokens=target_tokens,
    )

    try:
        response = messaging.send_each_for_multicast(message)
        print(f"Notifications dispatch completed: {response.success_count} succeeded")

        return https_fn.Response(
            json.dumps({
                "status": "success",
                "message": "Notifications sent successfully.",
                "notifiedCount": response.success_count
            }),
            status=200,
            mimetype="application/json"
        )

    except Exception as e:
        print(f"FCM multicast dispatch failed: {e}")
        return https_fn.Response(
            json.dumps({"status": "error", "message": "Failed to dispatch push notifications."}),
            status=500,
            mimetype="application/json"
        )
# fix: resolve cors_methods attribute error 20260619