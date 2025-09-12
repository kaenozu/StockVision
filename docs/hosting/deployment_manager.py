"""
ドキュメント公開・ホスティング最適化マネージャー

このモジュールは以下の機能を提供します：
- 複数プラットフォームへの自動デプロイメント
- CDN統合とキャッシュ最適化
- SEO最適化
- パフォーマンス監視
- SSL/HTTPS設定
- ドメイン管理
"""

import asyncio
import json
import logging
import mimetypes
import os
import tempfile
import zipfile
from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.parse import urljoin, urlparse

import aiofiles
# サードパーティライブラリ
import aiohttp
import boto3
import cloudflare
from jinja2 import Environment, FileSystemLoader, select_autoescape

# ログ設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DeploymentPlatform(Enum):
    """デプロイメントプラットフォーム"""

    VERCEL = "vercel"
    NETLIFY = "netlify"
    AWS_S3 = "aws_s3"
    AZURE_STATIC_APPS = "azure_static_apps"
    GCP_FIREBASE = "gcp_firebase"
    GITHUB_PAGES = "github_pages"
    CLOUDFLARE_PAGES = "cloudflare_pages"


class CDNProvider(Enum):
    """CDNプロバイダー"""

    CLOUDFLARE = "cloudflare"
    AWS_CLOUDFRONT = "aws_cloudfront"
    AZURE_CDN = "azure_cdn"
    GCP_CDN = "gcp_cdn"
    FASTLY = "fastly"


@dataclass
class DeploymentConfig:
    """デプロイメント設定"""

    platform: DeploymentPlatform
    project_name: str
    build_command: Optional[str] = None
    output_directory: str = "dist"
    environment_variables: Dict[str, str] = None
    custom_domain: Optional[str] = None
    ssl_enabled: bool = True
    cdn_provider: Optional[CDNProvider] = None
    cache_settings: Dict[str, Any] = None

    def __post_init__(self):
        if self.environment_variables is None:
            self.environment_variables = {}
        if self.cache_settings is None:
            self.cache_settings = {}


@dataclass
class DeploymentResult:
    """デプロイメント結果"""

    platform: DeploymentPlatform
    success: bool
    deployment_url: Optional[str] = None
    deployment_id: Optional[str] = None
    build_log: Optional[str] = None
    error_message: Optional[str] = None
    build_time: Optional[float] = None
    deployed_at: Optional[datetime] = None


@dataclass
class PerformanceMetrics:
    """パフォーマンスメトリクス"""

    page_load_time: float
    first_contentful_paint: float
    largest_contentful_paint: float
    cumulative_layout_shift: float
    first_input_delay: float
    lighthouse_score: int
    core_web_vitals_passed: bool


class SEOOptimizer:
    """SEO最適化クラス"""

    def __init__(self):
        self.meta_template = Environment(
            loader=FileSystemLoader("."), autoescape=select_autoescape(["html", "xml"])
        )

    def generate_sitemap(self, pages: List[Dict[str, Any]], base_url: str) -> str:
        """サイトマップ生成"""
        sitemap_xml = ['<?xml version="1.0" encoding="UTF-8"?>']
        sitemap_xml.append(
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
        )

        for page in pages:
            url = urljoin(base_url, page["path"])
            last_modified = page.get("last_modified", datetime.now(timezone.utc))
            priority = page.get("priority", 0.5)
            changefreq = page.get("changefreq", "monthly")

            sitemap_xml.append("  <url>")
            sitemap_xml.append(f"    <loc>{url}</loc>")
            sitemap_xml.append(f"    <lastmod>{last_modified.isoformat()}</lastmod>")
            sitemap_xml.append(f"    <changefreq>{changefreq}</changefreq>")
            sitemap_xml.append(f"    <priority>{priority}</priority>")
            sitemap_xml.append("  </url>")

        sitemap_xml.append("</urlset>")
        return "\n".join(sitemap_xml)

    def generate_robots_txt(
        self, sitemap_url: str, disallowed_paths: List[str] = None
    ) -> str:
        """robots.txt生成"""
        if disallowed_paths is None:
            disallowed_paths = ["/admin/", "/api/", "/.well-known/"]

        robots_txt = ["User-agent: *"]

        for path in disallowed_paths:
            robots_txt.append(f"Disallow: {path}")

        robots_txt.append("")
        robots_txt.append(f"Sitemap: {sitemap_url}")

        return "\n".join(robots_txt)

    def optimize_html_meta(self, html_content: str, metadata: Dict[str, str]) -> str:
        """HTMLメタタグ最適化"""
        # 基本的なメタタグを追加/更新
        meta_tags = []

        # 必須メタタグ
        if "title" in metadata:
            meta_tags.append(f"<title>{metadata['title']}</title>")

        if "description" in metadata:
            meta_tags.append(
                f'<meta name="description" content="{metadata["description"]}">'
            )

        # OGタグ
        if "og_title" in metadata:
            meta_tags.append(
                f'<meta property="og:title" content="{metadata["og_title"]}">'
            )

        if "og_description" in metadata:
            meta_tags.append(
                f'<meta property="og:description" content="{metadata["og_description"]}">'
            )

        if "og_image" in metadata:
            meta_tags.append(
                f'<meta property="og:image" content="{metadata["og_image"]}">'
            )

        # Twitterカード
        if "twitter_title" in metadata:
            meta_tags.append('<meta name="twitter:card" content="summary_large_image">')
            meta_tags.append(
                f'<meta name="twitter:title" content="{metadata["twitter_title"]}">'
            )

        # メタタグをHTMLヘッドに挿入
        head_end = html_content.find("</head>")
        if head_end != -1:
            meta_section = "\n    " + "\n    ".join(meta_tags) + "\n  "
            html_content = (
                html_content[:head_end] + meta_section + html_content[head_end:]
            )

        return html_content

    def generate_structured_data(self, content_type: str, data: Dict[str, Any]) -> str:
        """構造化データ生成"""
        if content_type == "article":
            structured_data = {
                "@context": "https://schema.org",
                "@type": "Article",
                "headline": data.get("title", ""),
                "description": data.get("description", ""),
                "author": {
                    "@type": "Person",
                    "name": data.get("author", "StockVision Team"),
                },
                "datePublished": data.get("published_date", ""),
                "dateModified": data.get("modified_date", ""),
                "publisher": {
                    "@type": "Organization",
                    "name": "StockVision",
                    "logo": {"@type": "ImageObject", "url": data.get("logo_url", "")},
                },
            }
        elif content_type == "software":
            structured_data = {
                "@context": "https://schema.org",
                "@type": "SoftwareApplication",
                "name": data.get("name", "StockVision"),
                "description": data.get("description", ""),
                "applicationCategory": "FinanceApplication",
                "operatingSystem": data.get("operating_system", "Web, iOS, Android"),
                "offers": {
                    "@type": "Offer",
                    "price": data.get("price", "0"),
                    "priceCurrency": "USD",
                },
            }
        else:
            structured_data = {
                "@context": "https://schema.org",
                "@type": "WebSite",
                "name": data.get("name", "StockVision"),
                "url": data.get("url", ""),
                "description": data.get("description", ""),
            }

        return json.dumps(structured_data, indent=2)


class PerformanceMonitor:
    """パフォーマンス監視クラス"""

    async def run_lighthouse_audit(self, url: str) -> PerformanceMetrics:
        """Lighthouseパフォーマンス監査"""
        # 実際の実装では、Lighthouse APIやPuppeteerを使用
        # ここではモック実装
        await asyncio.sleep(2)  # 監査をシミュレート

        return PerformanceMetrics(
            page_load_time=1.2,
            first_contentful_paint=0.8,
            largest_contentful_paint=1.5,
            cumulative_layout_shift=0.05,
            first_input_delay=50,
            lighthouse_score=92,
            core_web_vitals_passed=True,
        )

    async def check_page_speed(self, url: str) -> Dict[str, float]:
        """ページ速度チェック"""
        async with aiohttp.ClientSession() as session:
            start_time = asyncio.get_event_loop().time()
            async with session.get(url) as response:
                await response.text()
                load_time = asyncio.get_event_loop().time() - start_time

                return {
                    "load_time": load_time,
                    "response_time": response.headers.get("x-response-time", 0),
                    "status_code": response.status,
                    "content_length": len(await response.text()),
                }

    async def monitor_uptime(self, url: str, interval: int = 300) -> bool:
        """稼働時間監視"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    url, timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    return response.status == 200
        except Exception as e:
            logger.error(f"Uptime check failed for {url}: {e}")
            return False


class CDNManager:
    """CDN管理クラス"""

    def __init__(self, provider: CDNProvider, config: Dict[str, Any]):
        self.provider = provider
        self.config = config
        self._client = None

    async def setup_cdn(
        self, origin_url: str, custom_domain: Optional[str] = None
    ) -> Dict[str, Any]:
        """CDNセットアップ"""
        if self.provider == CDNProvider.CLOUDFLARE:
            return await self._setup_cloudflare_cdn(origin_url, custom_domain)
        elif self.provider == CDNProvider.AWS_CLOUDFRONT:
            return await self._setup_cloudfront_cdn(origin_url, custom_domain)
        elif self.provider == CDNProvider.AZURE_CDN:
            return await self._setup_azure_cdn(origin_url, custom_domain)
        else:
            raise NotImplementedError(f"CDN provider {self.provider} not implemented")

    async def _setup_cloudflare_cdn(
        self, origin_url: str, custom_domain: Optional[str] = None
    ) -> Dict[str, Any]:
        """Cloudflare CDNセットアップ"""
        cf = cloudflare.CloudFlare(
            email=self.config.get("email"), token=self.config.get("api_token")
        )

        # ゾーン情報取得
        zone_name = custom_domain or urlparse(origin_url).netloc
        zones = cf.zones.get(params={"name": zone_name})

        if not zones:
            raise ValueError(f"Zone {zone_name} not found in Cloudflare")

        zone_id = zones[0]["id"]

        # CDN設定
        cdn_settings = {
            "caching_level": "aggressive",
            "browser_cache_ttl": 31536000,  # 1年
            "development_mode": False,
            "minify": {"css": True, "html": True, "js": True},
        }

        for setting, value in cdn_settings.items():
            cf.zones.settings.patch(zone_id, setting, data={"value": value})

        return {
            "cdn_url": f"https://{zone_name}",
            "zone_id": zone_id,
            "settings": cdn_settings,
        }

    async def _setup_cloudfront_cdn(
        self, origin_url: str, custom_domain: Optional[str] = None
    ) -> Dict[str, Any]:
        """AWS CloudFront CDNセットアップ"""
        cloudfront = boto3.client(
            "cloudfront",
            aws_access_key_id=self.config.get("access_key_id"),
            aws_secret_access_key=self.config.get("secret_access_key"),
            region_name=self.config.get("region", "us-east-1"),
        )

        origin_domain = urlparse(origin_url).netloc

        distribution_config = {
            "CallerReference": f"stockvision-docs-{datetime.now().timestamp()}",
            "Comment": "StockVision Documentation CDN",
            "Origins": {
                "Quantity": 1,
                "Items": [
                    {
                        "Id": "docs-origin",
                        "DomainName": origin_domain,
                        "CustomOriginConfig": {
                            "HTTPPort": 443,
                            "HTTPSPort": 443,
                            "OriginProtocolPolicy": "https-only",
                        },
                    }
                ],
            },
            "DefaultCacheBehavior": {
                "TargetOriginId": "docs-origin",
                "ViewerProtocolPolicy": "redirect-to-https",
                "MinTTL": 0,
                "ForwardedValues": {
                    "QueryString": False,
                    "Cookies": {"Forward": "none"},
                },
                "Compress": True,
            },
            "Enabled": True,
            "PriceClass": "PriceClass_100",
        }

        if custom_domain:
            distribution_config["Aliases"] = {"Quantity": 1, "Items": [custom_domain]}

        response = cloudfront.create_distribution(
            DistributionConfig=distribution_config
        )

        return {
            "distribution_id": response["Distribution"]["Id"],
            "cdn_url": response["Distribution"]["DomainName"],
            "status": response["Distribution"]["Status"],
        }

    async def invalidate_cache(self, paths: List[str]) -> bool:
        """キャッシュ無効化"""
        if self.provider == CDNProvider.CLOUDFLARE:
            return await self._invalidate_cloudflare_cache(paths)
        elif self.provider == CDNProvider.AWS_CLOUDFRONT:
            return await self._invalidate_cloudfront_cache(paths)
        else:
            logger.warning(f"Cache invalidation not implemented for {self.provider}")
            return True

    async def _invalidate_cloudflare_cache(self, paths: List[str]) -> bool:
        """Cloudflareキャッシュ無効化"""
        try:
            cf = cloudflare.CloudFlare(
                email=self.config.get("email"), token=self.config.get("api_token")
            )

            zone_id = self.config.get("zone_id")
            cf.zones.purge_cache.post(zone_id, data={"files": paths})
            return True
        except Exception as e:
            logger.error(f"Cloudflare cache invalidation failed: {e}")
            return False

    async def _invalidate_cloudfront_cache(self, paths: List[str]) -> bool:
        """CloudFrontキャッシュ無効化"""
        try:
            cloudfront = boto3.client("cloudfront")
            distribution_id = self.config.get("distribution_id")

            cloudfront.create_invalidation(
                DistributionId=distribution_id,
                InvalidationBatch={
                    "Paths": {"Quantity": len(paths), "Items": paths},
                    "CallerReference": f"invalidation-{datetime.now().timestamp()}",
                },
            )
            return True
        except Exception as e:
            logger.error(f"CloudFront cache invalidation failed: {e}")
            return False


class DeploymentManager:
    """デプロイメント管理メインクラス"""

    def __init__(self):
        self.seo_optimizer = SEOOptimizer()
        self.performance_monitor = PerformanceMonitor()
        self.deployments_history: List[DeploymentResult] = []

    async def deploy_to_platform(
        self, config: DeploymentConfig, source_path: str
    ) -> DeploymentResult:
        """指定プラットフォームにデプロイ"""
        start_time = asyncio.get_event_loop().time()

        try:
            if config.platform == DeploymentPlatform.VERCEL:
                result = await self._deploy_to_vercel(config, source_path)
            elif config.platform == DeploymentPlatform.NETLIFY:
                result = await self._deploy_to_netlify(config, source_path)
            elif config.platform == DeploymentPlatform.AWS_S3:
                result = await self._deploy_to_s3(config, source_path)
            elif config.platform == DeploymentPlatform.GITHUB_PAGES:
                result = await self._deploy_to_github_pages(config, source_path)
            else:
                raise NotImplementedError(f"Platform {config.platform} not implemented")

            result.build_time = asyncio.get_event_loop().time() - start_time
            result.deployed_at = datetime.now(timezone.utc)

            self.deployments_history.append(result)
            return result

        except Exception as e:
            error_result = DeploymentResult(
                platform=config.platform,
                success=False,
                error_message=str(e),
                build_time=asyncio.get_event_loop().time() - start_time,
            )
            self.deployments_history.append(error_result)
            return error_result

    async def _deploy_to_vercel(
        self, config: DeploymentConfig, source_path: str
    ) -> DeploymentResult:
        """Vercelデプロイメント"""
        # Vercel APIを使用したデプロイメント
        vercel_api_url = "https://api.vercel.com/v13/deployments"

        # TODO: Vercel API requires proper file upload (multipart/form-data or direct file upload),
        # not sending files as JSON. The current implementation is a placeholder.
        # For now, commenting out the zip creation as it's not used correctly.
        # zip_path = await self._create_deployment_package(source_path)

        async with aiohttp.ClientSession() as session:
            # デプロイメント作成
            deploy_data = {
                "name": config.project_name,
                "files": [],  # This needs to be populated with file data for Vercel
                "projectSettings": {
                    "buildCommand": config.build_command,
                    "outputDirectory": config.output_directory,
                    "framework": "static",
                },
                "env": config.environment_variables,
            }

            headers = {
                "Authorization": f"Bearer {os.getenv('VERCEL_TOKEN')}",
                "Content-Type": "application/json",  # This might need to be changed for file uploads
            }

            # ファイルをアップロード（実際の実装では複数ファイルを個別にアップロード）
            async with session.post(
                vercel_api_url, json=deploy_data, headers=headers
            ) as response:
                if response.status == 200:
                    result_data = await response.json()
                    return DeploymentResult(
                        platform=config.platform,
                        success=True,
                        deployment_url=result_data.get("url"),
                        deployment_id=result_data.get("id"),
                    )
                else:
                    error_text = await response.text()
                    return DeploymentResult(
                        platform=config.platform,
                        success=False,
                        error_message=f"Vercel deployment failed: {error_text}",
                    )

    async def _deploy_to_netlify(
        self, config: DeploymentConfig, source_path: str
    ) -> DeploymentResult:
        """Netlifyデプロイメント"""
        netlify_api_url = "https://api.netlify.com/api/v1/sites"

        zip_path = await self._create_deployment_package(source_path)

        async with aiohttp.ClientSession() as session:
            headers = {
                "Authorization": f"Bearer {os.getenv('NETLIFY_ACCESS_TOKEN')}",
                "Content-Type": "application/zip",
            }

            # サイト作成またはデプロイ
            # site_data is not directly used as a variable, its content is used in the URL or headers

            async with aiofiles.open(zip_path, "rb") as zip_file:
                zip_content = await zip_file.read()

                async with session.post(
                    f"{netlify_api_url}/{config.project_name}/deploys",
                    data=zip_content,
                    headers=headers,
                ) as response:
                    if response.status in [200, 201]:
                        result_data = await response.json()
                        return DeploymentResult(
                            platform=config.platform,
                            success=True,
                            deployment_url=result_data.get("ssl_url")
                            or result_data.get("deploy_ssl_url"),
                            deployment_id=result_data.get("id"),
                        )
                    else:
                        error_text = await response.text()
                        return DeploymentResult(
                            platform=config.platform,
                            success=False,
                            error_message=f"Netlify deployment failed: {error_text}",
                        )

    async def _deploy_to_s3(
        self, config: DeploymentConfig, source_path: str
    ) -> DeploymentResult:
        """AWS S3デプロイメント"""
        try:
            s3_client = boto3.client(
                "s3",
                aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
                aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
                region_name=os.getenv("AWS_DEFAULT_REGION", "us-east-1"),
            )

            bucket_name = config.project_name.lower().replace("_", "-")

            # バケット作成（存在しない場合）
            try:
                s3_client.create_bucket(Bucket=bucket_name)

                # 静的ウェブサイトホスティング設定
                website_configuration = {
                    "ErrorDocument": {"Key": "error.html"},
                    "IndexDocument": {"Suffix": "index.html"},
                }
                s3_client.put_bucket_website(
                    Bucket=bucket_name, WebsiteConfiguration=website_configuration
                )

                # パブリック読み取りポリシー設定
                bucket_policy = {
                    "Version": "2012-10-17",
                    "Statement": [
                        {
                            "Sid": "PublicReadGetObject",
                            "Effect": "Allow",
                            "Principal": "*",
                            "Action": "s3:GetObject",
                            "Resource": f"arn:aws:s3:::{bucket_name}/*",
                        }
                    ],
                }
                s3_client.put_bucket_policy(
                    Bucket=bucket_name, Policy=json.dumps(bucket_policy)
                )

            except s3_client.exceptions.BucketAlreadyOwnedByYou:
                pass

            # ファイルアップロード
            source_dir = Path(source_path)
            uploaded_files = []

            for file_path in source_dir.rglob("*"):
                if file_path.is_file():
                    relative_path = file_path.relative_to(source_dir)
                    key = str(relative_path).replace("\\", "/")

                    content_type, _ = mimetypes.guess_type(str(file_path))
                    if content_type is None:
                        content_type = "binary/octet-stream"

                    s3_client.upload_file(
                        str(file_path),
                        bucket_name,
                        key,
                        ExtraArgs={
                            "ContentType": content_type,
                            "CacheControl": (
                                "max-age=31536000"
                                if key.endswith((".css", ".js", ".png", ".jpg"))
                                else "no-cache"
                            ),
                        },
                    )
                    uploaded_files.append(key)

            website_url = f"http://{bucket_name}.s3-website-{s3_client._client_config.region_name}.amazonaws.com"

            return DeploymentResult(
                platform=config.platform,
                success=True,
                deployment_url=website_url,
                deployment_id=bucket_name,
                build_log=f"Uploaded {len(uploaded_files)} files",
            )

        except Exception as e:
            return DeploymentResult(
                platform=config.platform,
                success=False,
                error_message=f"S3 deployment failed: {str(e)}",
            )

    async def _deploy_to_github_pages(
        self, config: DeploymentConfig, source_path: str
    ) -> DeploymentResult:
        """GitHub Pagesデプロイメント"""
        # GitHub Pagesは通常GitHubアクションで自動化される
        # ここでは基本的な設定とファイル準備のみ実装

        try:
            # .nojekyll ファイル作成（Jekyll処理を無効化）
            nojekyll_path = Path(source_path) / ".nojekyll"
            nojekyll_path.touch()

            # CNAME ファイル作成（カスタムドメイン用）
            if config.custom_domain:
                cname_path = Path(source_path) / "CNAME"
                with open(cname_path, "w") as f:
                    f.write(config.custom_domain)

            return DeploymentResult(
                platform=config.platform,
                success=True,
                deployment_url=f"https://{config.project_name.split('/')[-1]}.github.io",
                build_log="Files prepared for GitHub Pages deployment",
            )

        except Exception as e:
            return DeploymentResult(
                platform=config.platform,
                success=False,
                error_message=f"GitHub Pages preparation failed: {str(e)}",
            )

    async def _create_deployment_package(self, source_path: str) -> str:
        """デプロイメントパッケージ作成"""
        with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as tmp_file:
            zip_path = tmp_file.name

        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
            source_dir = Path(source_path)
            for file_path in source_dir.rglob("*"):
                if file_path.is_file() and not str(file_path).startswith("."):
                    arcname = file_path.relative_to(source_dir)
                    zipf.write(file_path, arcname)

        return zip_path

    async def optimize_for_seo(
        self, build_path: str, pages_metadata: List[Dict[str, Any]], base_url: str
    ) -> None:
        """SEO最適化処理"""
        build_dir = Path(build_path)

        # サイトマップ生成
        sitemap_content = self.seo_optimizer.generate_sitemap(pages_metadata, base_url)
        sitemap_path = build_dir / "sitemap.xml"
        with open(sitemap_path, "w", encoding="utf-8") as f:
            f.write(sitemap_content)

        # robots.txt生成
        sitemap_url = urljoin(base_url, "sitemap.xml")
        robots_content = self.seo_optimizer.generate_robots_txt(sitemap_url)
        robots_path = build_dir / "robots.txt"
        with open(robots_path, "w", encoding="utf-8") as f:
            f.write(robots_content)

        # HTMLファイルのメタタグ最適化
        for html_file in build_dir.rglob("*.html"):
            with open(html_file, "r", encoding="utf-8") as f:
                content = f.read()

            # ファイルに対応するメタデータを検索
            relative_path = html_file.relative_to(build_dir)
            page_metadata = next(
                (
                    page
                    for page in pages_metadata
                    if page.get("path", "").strip("/")
                    == str(relative_path).replace("\\", "/").strip("/")
                ),
                {},
            )

            if page_metadata:
                optimized_content = self.seo_optimizer.optimize_html_meta(
                    content, page_metadata
                )

                # 構造化データ追加
                structured_data = self.seo_optimizer.generate_structured_data(
                    page_metadata.get("type", "article"), page_metadata
                )

                script_tag = f'\n<script type="application/ld+json">\n{structured_data}\n</script>\n</head>'
                optimized_content = optimized_content.replace("</head>", script_tag)

                with open(html_file, "w", encoding="utf-8") as f:
                    f.write(optimized_content)

    async def multi_platform_deploy(
        self, configs: List[DeploymentConfig], source_path: str
    ) -> List[DeploymentResult]:
        """複数プラットフォーム同時デプロイ"""
        tasks = [self.deploy_to_platform(config, source_path) for config in configs]

        results = await asyncio.gather(*tasks, return_exceptions=True)

        deployment_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                deployment_results.append(
                    DeploymentResult(
                        platform=configs[i].platform,
                        success=False,
                        error_message=str(result),
                    )
                )
            else:
                deployment_results.append(result)

        return deployment_results

    async def setup_monitoring(self, urls: List[str]) -> Dict[str, Any]:
        """監視設定"""
        monitoring_results = {}

        for url in urls:
            try:
                # パフォーマンス監査
                performance = await self.performance_monitor.run_lighthouse_audit(url)

                # ページ速度チェック
                page_speed = await self.performance_monitor.check_page_speed(url)

                # 稼働時間チェック
                is_online = await self.performance_monitor.monitor_uptime(url)

                monitoring_results[url] = {
                    "performance": performance,
                    "page_speed": page_speed,
                    "uptime": is_online,
                    "checked_at": datetime.now(timezone.utc).isoformat(),
                }

            except Exception as e:
                monitoring_results[url] = {
                    "error": str(e),
                    "checked_at": datetime.now(timezone.utc).isoformat(),
                }

        return monitoring_results

    def generate_deployment_report(self) -> Dict[str, Any]:
        """デプロイメントレポート生成"""
        successful_deployments = [d for d in self.deployments_history if d.success]
        failed_deployments = [d for d in self.deployments_history if not d.success]

        platform_stats = {}
        for deployment in self.deployments_history:
            platform = deployment.platform.value
            if platform not in platform_stats:
                platform_stats[platform] = {
                    "success": 0,
                    "failure": 0,
                    "avg_build_time": 0,
                }

            if deployment.success:
                platform_stats[platform]["success"] += 1
            else:
                platform_stats[platform]["failure"] += 1

            if deployment.build_time:
                current_avg = platform_stats[platform]["avg_build_time"]
                total_deployments = (
                    platform_stats[platform]["success"]
                    + platform_stats[platform]["failure"]
                )
                platform_stats[platform]["avg_build_time"] = (
                    current_avg * (total_deployments - 1) + deployment.build_time
                ) / total_deployments

        return {
            "summary": {
                "total_deployments": len(self.deployments_history),
                "successful_deployments": len(successful_deployments),
                "failed_deployments": len(failed_deployments),
                "success_rate": (
                    len(successful_deployments) / len(self.deployments_history) * 100
                    if self.deployments_history
                    else 0
                ),
            },
            "platform_statistics": platform_stats,
            "recent_deployments": [
                {
                    "platform": d.platform.value,
                    "success": d.success,
                    "deployment_url": d.deployment_url,
                    "deployed_at": d.deployed_at.isoformat() if d.deployed_at else None,
                    "build_time": d.build_time,
                    "error_message": d.error_message,
                }
                for d in sorted(
                    self.deployments_history,
                    key=lambda x: x.deployed_at
                    or datetime.min.replace(tzinfo=timezone.utc),
                    reverse=True,
                )[:10]
            ],
        }


# CLI インターフェース
async def main():
    """メイン実行関数"""
    import argparse

    parser = argparse.ArgumentParser(description="Documentation Deployment Manager")
    parser.add_argument(
        "--config", required=True, help="Deployment configuration file (JSON)"
    )
    parser.add_argument("--source", required=True, help="Source directory path")
    parser.add_argument(
        "--optimize-seo", action="store_true", help="Enable SEO optimization"
    )
    parser.add_argument(
        "--monitor", action="store_true", help="Enable performance monitoring"
    )

    args = parser.parse_args()

    # 設定ファイル読み込み
    with open(args.config, "r") as f:
        config_data = json.load(f)

    deployment_manager = DeploymentManager()

    # デプロイメント設定作成
    configs = []
    for platform_config in config_data.get("platforms", []):
        config = DeploymentConfig(
            platform=DeploymentPlatform(platform_config["platform"]),
            project_name=platform_config["project_name"],
            build_command=platform_config.get("build_command"),
            output_directory=platform_config.get("output_directory", "dist"),
            environment_variables=platform_config.get("environment_variables", {}),
            custom_domain=platform_config.get("custom_domain"),
            ssl_enabled=platform_config.get("ssl_enabled", True),
            cdn_provider=(
                CDNProvider(platform_config["cdn_provider"])
                if platform_config.get("cdn_provider")
                else None
            ),
            cache_settings=platform_config.get("cache_settings", {}),
        )
        configs.append(config)

    # SEO最適化
    if args.optimize_seo:
        pages_metadata = config_data.get("pages_metadata", [])
        base_url = config_data.get("base_url", "https://example.com")
        await deployment_manager.optimize_for_seo(args.source, pages_metadata, base_url)

    # デプロイメント実行
    results = await deployment_manager.multi_platform_deploy(configs, args.source)

    # 結果表示
    for result in results:
        print(f"\n{result.platform.value}:")
        print(f"  Success: {result.success}")
        if result.success:
            print(f"  URL: {result.deployment_url}")
            print(f"  Build Time: {result.build_time:.2f}s")
        else:
            print(f"  Error: {result.error_message}")

    # 監視セットアップ
    if args.monitor:
        urls = [r.deployment_url for r in results if r.success and r.deployment_url]
        if urls:
            monitoring_results = await deployment_manager.setup_monitoring(urls)
            print("\nMonitoring Results:")
            for url, metrics in monitoring_results.items():
                print(f"  {url}: {metrics}")

    # レポート生成
    report = deployment_manager.generate_deployment_report()
    print("\nDeployment Report:")
    print(f"  Total deployments: {report['summary']['total_deployments']}")
    print(f"  Success rate: {report['summary']['success_rate']:.1f}%")


if __name__ == "__main__":
    asyncio.run(main())
