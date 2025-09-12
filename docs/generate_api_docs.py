"""
APIドキュメントをOpenAPI仕様から自動生成するスクリプト
"""

import json
from pathlib import Path


def generate_api_docs():
    """
    OpenAPI JSONファイルからMarkdown形式のAPIドキュメントを生成します。
    """
    # OpenAPI JSONファイルのパス
    openapi_path = Path(__file__).parent.parent / "openapi.json"

    # 生成されたドキュメントの出力先
    output_path = Path(__file__).parent / "api_spec_auto.md"

    # OpenAPI JSONファイルが存在するか確認
    if not openapi_path.exists():
        print(f"OpenAPIファイルが見つかりません: {openapi_path}")
        return

    # OpenAPI JSONを読み込む
    with open(openapi_path, "r", encoding="utf-8") as f:
        openapi_spec = json.load(f)

    # Markdownドキュメントを生成
    markdown_content = generate_markdown_from_openapi(openapi_spec)

    # ファイルに書き込む
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(markdown_content)

    print(f"APIドキュメントが生成されました: {output_path}")


def generate_markdown_from_openapi(spec):
    """
    OpenAPI仕様からMarkdownを生成します。
    """
    markdown = []

    # タイトル
    markdown.append(f"# {spec['info']['title']}")
    markdown.append("")
    markdown.append(f"**Version:** {spec['info']['version']}")
    markdown.append("")
    markdown.append(f"**Description:** {spec['info']['description']}")
    markdown.append("")

    # サーバー情報
    if "servers" in spec:
        markdown.append("## サーバー")
        markdown.append("")
        for server in spec["servers"]:
            markdown.append(f"- **URL:** {server['url']}")
            if "description" in server:
                markdown.append(f"  - **Description:** {server['description']}")
        markdown.append("")

    # タグとパス
    tags = spec.get("tags", [])
    paths = spec.get("paths", {})

    # タグごとにセクションを作成
    for tag in tags:
        tag_name = tag["name"]
        tag_description = tag.get("description", "")

        markdown.append(f"## {tag_name}")
        markdown.append("")
        if tag_description:
            markdown.append(f"{tag_description}")
            markdown.append("")

        # このタグに関連するパスを検索
        for path, path_item in paths.items():
            for method, operation in path_item.items():
                if "tags" in operation and tag_name in operation["tags"]:
                    markdown.append(f"### {method.upper()} {path}")
                    markdown.append("")

                    # 概要
                    if "summary" in operation:
                        markdown.append(f"**概要:** {operation['summary']}")
                        markdown.append("")

                    # 説明
                    if "description" in operation:
                        markdown.append(f"**説明:** {operation['description']}")
                        markdown.append("")

                    # パラメータ
                    if "parameters" in operation and operation["parameters"]:
                        markdown.append("**パラメータ**")
                        markdown.append("")
                        markdown.append("| 名前 | 場所 | 必須 | 型 | 説明 |")
                        markdown.append("| :--- | :--- | :--- | :--- | :--- |")
                        for param in operation["parameters"]:
                            name = param.get("name", "")
                            in_ = param.get("in", "")
                            required = "Yes" if param.get("required", False) else "No"
                            schema = param.get("schema", {})
                            type_ = schema.get("type", "")
                            description = param.get("description", "")
                            markdown.append(
                                f"| {name} | {in_} | {required} | {type_} | {description} |"
                            )
                        markdown.append("")

                    # リクエストボディ
                    if "requestBody" in operation:
                        markdown.append("**リクエストボディ**")
                        markdown.append("")
                        content = operation["requestBody"].get("content", {})
                        for content_type, content_schema in content.items():
                            markdown.append(f"**Content-Type:** {content_type}")
                            markdown.append("")
                            # TODO: schemaからサンプルJSONを生成
                            markdown.append("```json")
                            markdown.append("{")
                            markdown.append("  // リクエストボディの例")
                            markdown.append("}")
                            markdown.append("```")
                            markdown.append("")

                    # レスポンス
                    if "responses" in operation:
                        markdown.append("**レスポンス**")
                        markdown.append("")
                        for status_code, response in operation["responses"].items():
                            markdown.append(f"**Status Code: {status_code}**")
                            markdown.append("")
                            if "description" in response:
                                markdown.append(f"**説明:** {response['description']}")
                                markdown.append("")
                            content = response.get("content", {})
                            for content_type, content_schema in content.items():
                                markdown.append(f"**Content-Type:** {content_type}")
                                markdown.append("")
                                # TODO: schemaからサンプルJSONを生成
                                markdown.append("```json")
                                markdown.append("{")
                                markdown.append("  // レスポンスの例")
                                markdown.append("}")
                                markdown.append("```")
                                markdown.append("")

                    markdown.append("---")
                    markdown.append("")

    return "\n".join(markdown)


if __name__ == "__main__":
    generate_api_docs()
