"""
ドキュメント品質管理システム

このモジュールはドキュメントの品質チェック、品質メトリクス計算、
品質改善提案を提供します。
"""

import json
import asyncio
import logging
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional

import spacy  # Added this line
import yaml
from nltk.corpus import stopwords
from nltk.sentiment import SentimentIntensityAnalyzer
from nltk.tokenize import sent_tokenize, word_tokenize
from textstat import (automated_readability_index, flesch_kincaid_grade,
                      flesch_reading_ease)

logger = logging.getLogger(__name__)

# SpaCyモデルを読み込み
nlp = None
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    logger.warning(
        "SpaCy English model not found. Install with: python -m spacy download en_core_web_sm"
    )


class QualityLevel(Enum):
    EXCELLENT = "excellent"
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"
    CRITICAL = "critical"


class QualityCategory(Enum):
    READABILITY = "readability"
    COMPLETENESS = "completeness"
    CONSISTENCY = "consistency"
    ACCURACY = "accuracy"
    ACCESSIBILITY = "accessibility"
    SEO = "seo"
    STRUCTURE = "structure"
    LANGUAGE = "language"


@dataclass
class QualityIssue:
    """品質問題を表すデータクラス"""

    category: QualityCategory
    severity: QualityLevel
    message: str
    line_number: Optional[int] = None
    column: Optional[int] = None
    suggestion: Optional[str] = None
    rule_id: str = ""


@dataclass
class QualityMetrics:
    """品質メトリクスを表すデータクラス"""

    readability_score: float
    flesch_kincaid_grade: float
    automated_readability_index: float
    word_count: int
    sentence_count: int
    paragraph_count: int
    avg_sentence_length: float
    avg_word_length: float
    complexity_score: float
    sentiment_score: float
    overall_score: float
    quality_level: QualityLevel


@dataclass
class QualityReport:
    """品質レポートを表すデータクラス"""

    file_path: str
    timestamp: datetime
    metrics: QualityMetrics
    issues: List[QualityIssue]
    suggestions: List[str]
    previous_score: Optional[float] = None
    improvement: Optional[float] = None


class QualityRules:
    """品質ルール定義"""

    def __init__(self):
        self.rules = {
            "min_word_count": 100,
            "max_sentence_length": 25,
            "min_readability_score": 60,
            "max_flesch_kincaid_grade": 8,
            "max_paragraph_length": 5,
            "required_headings": ["概要", "使用方法", "例"],
            "forbidden_words": ["TODO", "FIXME", "hack", "workaround"],
            "max_heading_depth": 4,
            "min_code_comments": 0.1,  # 10% of lines should have comments
            "spelling_check": True,
            "grammar_check": True,
        }

    def update_rules(self, new_rules: Dict[str, Any]):
        """ルールを更新"""
        self.rules.update(new_rules)


class DocumentAnalyzer:
    """ドキュメント分析器"""

    def __init__(self, nlp_model: Any):
        self.sia = SentimentIntensityAnalyzer()
        self.stop_words = set(stopwords.words("english"))
        self.nlp = nlp_model  # Store nlp model as instance variable

    def analyze_readability(self, text: str) -> Dict[str, float]:
        """可読性分析"""
        try:
            # readability = flesch_reading_ease(text) # Commented out as it's unused
            # fk_grade = flesch_kincaid_grade(text) # Commented out as it's unused
            ari = automated_readability_index(text)

            return {
                "flesch_reading_ease": flesch_reading_ease(text),  # Use directly
                "flesch_kincaid_grade": flesch_kincaid_grade(text),  # Use directly
                "automated_readability_index": ari,
            }
        except Exception as e:
            logger.error(f"Error analyzing readability: {e}")
            return {
                "flesch_reading_ease": 0,
                "flesch_kincaid_grade": 0,
                "automated_readability_index": 0,
            }

    def analyze_structure(self, text: str) -> Dict[str, Any]:
        """文書構造分析"""
        lines = text.split("\n")
        sentences = sent_tokenize(text)
        words = word_tokenize(text)

        # 段落カウント（空行で区切られた文章ブロック）
        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]

        # 見出しカウント
        headings = [line for line in lines if line.strip().startswith("#")]

        return {
            "word_count": len(words),
            "sentence_count": len(sentences),
            "paragraph_count": len(paragraphs),
            "heading_count": len(headings),
            "line_count": len(lines),
            "avg_sentence_length": len(words) / len(sentences) if sentences else 0,
            "avg_word_length": (
                sum(len(word) for word in words) / len(words) if words else 0
            ),
            "headings": headings,
        }

    def analyze_sentiment(self, text: str) -> float:
        """感情分析"""
        scores = self.sia.polarity_scores(text)
        return scores["compound"]

    def analyze_complexity(self, text: str) -> float:
        """複雑性分析"""
        if not self.nlp:  # Use self.nlp
            return 0.0

        doc = self.nlp(text[:1000000])  # Use self.nlp

        complex_words = 0
        total_words = 0

        for token in doc:
            if token.is_alpha:
                total_words += 1
                # 3音節以上の単語を複雑とみなす
                if len(token.text) > 6:  # 簡易的な複雑性判定
                    complex_words += 1

        return complex_words / total_words if total_words > 0 else 0


class QualityChecker:
    """品質チェッカー"""

    def __init__(self, rules: QualityRules):
        self.rules = rules
        self.analyzer = DocumentAnalyzer()

    def check_completeness(self, text: str, file_path: str) -> List[QualityIssue]:
        """完全性チェック"""
        issues = []

        # 最小単語数チェック
        word_count = len(word_tokenize(text))
        if word_count < self.rules.rules["min_word_count"]:
            issues.append(
                QualityIssue(
                    category=QualityCategory.COMPLETENESS,
                    severity=QualityLevel.POOR,
                    message=f"Document is too short: {word_count} words (minimum: {self.rules.rules['min_word_count']})",
                    suggestion="Add more content to meet the minimum word count requirement",
                )
            )

        # 必須見出しチェック
        lines = text.lower().split("\n")
        for required_heading in self.rules.rules["required_headings"]:
            found = any(
                required_heading.lower() in line
                for line in lines
                if line.strip().startswith("#")
            )
            if not found:
                issues.append(
                    QualityIssue(
                        category=QualityCategory.COMPLETENESS,
                        severity=QualityLevel.FAIR,
                        message=f"Missing required heading: {required_heading}",
                        suggestion=f"Add a '{required_heading}' section to improve document structure",
                    )
                )

        return issues

    def check_readability(self, text: str) -> List[QualityIssue]:
        """可読性チェック"""
        issues = []

        readability_scores = self.analyzer.analyze_readability(text)
        structure = self.analyzer.analyze_structure(text)

        # Flesch Reading Easeスコア
        if (
            readability_scores["flesch_reading_ease"]
            < self.rules.rules["min_readability_score"]
        ):
            issues.append(
                QualityIssue(
                    category=QualityCategory.READABILITY,
                    severity=QualityLevel.FAIR,
                    message=f"Low readability score: {readability_scores['flesch_reading_ease']:.1f}",
                    suggestion="Use shorter sentences and simpler words to improve readability",
                )
            )

        # 文の長さチェック
        if structure["avg_sentence_length"] > self.rules.rules["max_sentence_length"]:
            issues.append(
                QualityIssue(
                    category=QualityCategory.READABILITY,
                    severity=QualityLevel.FAIR,
                    message=f"Average sentence too long: {structure['avg_sentence_length']:.1f} words",
                    suggestion="Break long sentences into shorter ones",
                )
            )

        return issues

    def check_consistency(self, text: str) -> List[QualityIssue]:
        """一貫性チェック"""
        issues = []

        # 見出しレベルの一貫性
        lines = text.split("\n")
        heading_levels = []

        for i, line in enumerate(lines):
            if line.strip().startswith("#"):
                level = len(re.match(r"^#+", line.strip()).group())
                heading_levels.append((i, level))

        # 見出しレベルの飛び越しチェック
        for i in range(1, len(heading_levels)):
            current_level = heading_levels[i][1]
            prev_level = heading_levels[i - 1][1]

            if current_level - prev_level > 1:
                issues.append(
                    QualityIssue(
                        category=QualityCategory.CONSISTENCY,
                        severity=QualityLevel.FAIR,
                        message=f"Heading level jump at line {heading_levels[i][0] + 1}",
                        line_number=heading_levels[i][0] + 1,
                        suggestion="Use consecutive heading levels (don't skip levels)",
                    )
                )

        return issues

    def check_forbidden_content(self, text: str) -> List[QualityIssue]:
        """禁止コンテンツチェック"""
        issues = []

        for forbidden_word in self.rules.rules["forbidden_words"]:
            if forbidden_word.lower() in text.lower():
                issues.append(
                    QualityIssue(
                        category=QualityCategory.ACCURACY,
                        severity=QualityLevel.POOR,
                        message=f"Found forbidden word: {forbidden_word}",
                        suggestion=f"Remove or replace '{forbidden_word}' with proper content",
                    )
                )

        return issues

    def check_structure(self, text: str) -> List[QualityIssue]:
        """構造チェック"""
        issues = []

        # structure = self.analyzer.analyze_structure(text) # Commented out as it's unused

        # 段落の長さチェック
        paragraphs = text.split("\n\n")
        for i, paragraph in enumerate(paragraphs):
            sentences = sent_tokenize(paragraph)
            if len(sentences) > self.rules.rules["max_paragraph_length"]:
                issues.append(
                    QualityIssue(
                        category=QualityCategory.STRUCTURE,
                        severity=QualityLevel.FAIR,
                        message=f"Paragraph {i+1} is too long: {len(sentences)} sentences",
                        suggestion="Break long paragraphs into shorter ones",
                    )
                )

        return issues

    async def analyze_document(self, file_path: str, content: str) -> QualityReport:
        """ドキュメント分析"""
        # 各種チェック実行
        completeness_issues = self.checker.check_completeness(content, file_path)
        readability_issues = self.checker.check_readability(content)
        consistency_issues = self.checker.check_consistency(content)
        forbidden_issues = self.checker.check_forbidden_content(content)
        structure_issues = self.checker.check_structure(content)

        all_issues = (
            completeness_issues
            + readability_issues
            + consistency_issues
            + forbidden_issues
            + structure_issues
        )

        # メトリクス計算
        readability_scores = self.analyzer.analyze_readability(content)
        structure_info = self.analyzer.analyze_structure(content)
        sentiment = self.analyzer.analyze_sentiment(content)
        complexity = self.analyzer.analyze_complexity(content)

        # 総合スコア計算
        overall_score = self._calculate_overall_score(
            readability_scores, structure_info, len(all_issues)
        )

        quality_level = self._determine_quality_level(overall_score)

        metrics = QualityMetrics(
            readability_score=readability_scores["flesch_reading_ease"],
            flesch_kincaid_grade=readability_scores["flesch_kincaid_grade"],
            automated_readability_index=readability_scores[
                "automated_readability_index"
            ],
            word_count=structure_info["word_count"],
            sentence_count=structure_info["sentence_count"],
            paragraph_count=structure_info["paragraph_count"],
            avg_sentence_length=structure_info["avg_sentence_length"],
            avg_word_length=structure_info["avg_word_length"],
            complexity_score=complexity,
            sentiment_score=sentiment,
            overall_score=overall_score,
            quality_level=quality_level,
        )

        # 改善提案生成
        suggestions = self._generate_suggestions(all_issues, metrics)

        # 前回のスコアと比較
        previous_score = None
        improvement = None
        if file_path in self.reports_history:
            previous_reports = self.reports_history[file_path]
            if previous_reports:
                previous_score = previous_reports[-1].metrics.overall_score
                improvement = overall_score - previous_score

        report = QualityReport(
            file_path=file_path,
            timestamp=datetime.now(timezone.utc),
            metrics=metrics,
            issues=all_issues,
            suggestions=suggestions,
            previous_score=previous_score,
            improvement=improvement,
        )

        # 履歴に追加
        if file_path not in self.reports_history:
            self.reports_history[file_path] = []
        self.reports_history[file_path].append(report)

        return report

    def _calculate_overall_score(
        self,
        readability: Dict[str, float],
        structure: Dict[str, Any],
        issues_count: int,
    ) -> float:
        """総合スコア計算"""
        # 基本スコア（0-100）
        base_score = 100

        # 可読性による減点
        if readability["flesch_reading_ease"] < 60:
            base_score -= (60 - readability["flesch_reading_ease"]) * 0.5

        # 問題数による減点
        base_score -= issues_count * 5

        # 文書長による調整
        if structure["word_count"] < 100:
            base_score -= 20
        elif structure["word_count"] > 2000:
            base_score += 10

        return max(0, min(100, base_score))

    def _determine_quality_level(self, score: float) -> QualityLevel:
        """品質レベル判定"""
        if score >= 90:
            return QualityLevel.EXCELLENT
        elif score >= 75:
            return QualityLevel.GOOD
        elif score >= 60:
            return QualityLevel.FAIR
        elif score >= 40:
            return QualityLevel.POOR
        else:
            return QualityLevel.CRITICAL

    def _generate_suggestions(
        self, issues: List[QualityIssue], metrics: QualityMetrics
    ) -> List[str]:
        """改善提案生成"""
        suggestions = []

        # 問題からの提案
        for issue in issues:
            if issue.suggestion:
                suggestions.append(issue.suggestion)

        # メトリクスからの提案
        if metrics.readability_score < 60:
            suggestions.append(
                "可読性を向上させるため、より短い文と簡単な単語を使用してください"
            )

        if metrics.avg_sentence_length > 20:
            suggestions.append("平均文長を短くするため、長い文を分割してください")

        if metrics.word_count < 200:
            suggestions.append("より詳細な説明を追加して文書の充実度を高めてください")

        if metrics.complexity_score > 0.3:
            suggestions.append(
                "専門用語の使用を控え、より理解しやすい表現を使用してください"
            )

        return list(set(suggestions))  # 重複除去

    async def analyze_directory(
        self, directory_path: str, file_patterns: List[str] = None
    ) -> List[QualityReport]:
        """ディレクトリ内のドキュメント一括分析"""
        if file_patterns is None:
            file_patterns = ["*.md", "*.rst", "*.txt"]

        reports = []
        directory = Path(directory_path)

        for pattern in file_patterns:
            for file_path in directory.rglob(pattern):
                try:
                    content = file_path.read_text(encoding="utf-8")
                    report = await self.analyze_document(str(file_path), content)
                    reports.append(report)
                except Exception as e:
                    print(f"Error analyzing {file_path}: {e}")

        return reports

    def generate_summary_report(self, reports: List[QualityReport]) -> Dict[str, Any]:
        """サマリーレポート生成"""
        if not reports:
            return {"error": "No reports provided"}

        total_files = len(reports)
        quality_levels = [report.metrics.quality_level.value for report in reports]
        avg_score = (
            sum(report.metrics.overall_score for report in reports) / total_files
        )

        # 品質レベル分布
        level_counts = {}
        for level in QualityLevel:
            level_counts[level.value] = quality_levels.count(level.value)

        # 最も多い問題カテゴリ
        all_issues = []
        for report in reports:
            all_issues.extend(report.issues)

        category_counts = {}
        for issue in all_issues:
            cat = issue.category.value
            category_counts[cat] = category_counts.get(cat, 0) + 1

        # 改善傾向
        improving_files = 0
        declining_files = 0
        for report in reports:
            if report.improvement:
                if report.improvement > 0:
                    improving_files += 1
                elif report.improvement < 0:
                    declining_files += 1

        return {
            "summary": {
                "total_files": total_files,
                "average_score": round(avg_score, 2),
                "quality_distribution": level_counts,
                "total_issues": len(all_issues),
                "most_common_issues": sorted(
                    category_counts.items(), key=lambda x: x[1], reverse=True
                )[:5],
            },
            "trends": {
                "improving_files": improving_files,
                "declining_files": declining_files,
                "stable_files": total_files - improving_files - declining_files,
            },
            "recommendations": self._generate_project_recommendations(reports),
        }

    def _generate_project_recommendations(
        self, reports: List[QualityReport]
    ) -> List[str]:
        """プロジェクト全体の改善提案"""
        recommendations = []

        # 全体の品質レベル
        low_quality_count = sum(
            1
            for r in reports
            if r.metrics.quality_level in [QualityLevel.POOR, QualityLevel.CRITICAL]
        )

        if low_quality_count > len(reports) * 0.3:
            recommendations.append(
                "プロジェクト全体の文書品質が低下しています。品質基準の見直しを検討してください"
            )

        # 共通問題の特定
        all_issues = []
        for report in reports:
            all_issues.extend(report.issues)

        category_counts = {}
        for issue in all_issues:
            cat = issue.category.value
            category_counts[cat] = category_counts.get(cat, 0) + 1

        if category_counts.get("readability", 0) > len(reports) * 0.5:
            recommendations.append(
                "可読性の問題が多くのファイルで見つかりました。文体ガイドラインの策定を推奨します"
            )

        if category_counts.get("completeness", 0) > len(reports) * 0.3:
            recommendations.append(
                "不完全な文書が多数あります。文書テンプレートの導入を検討してください"
            )

        return recommendations

    def export_report(self, report: QualityReport, format: str = "json") -> str:
        """レポートエクスポート"""
        data = {
            "file_path": report.file_path,
            "timestamp": report.timestamp.isoformat(),
            "metrics": {
                "readability_score": report.metrics.readability_score,
                "flesch_kincaid_grade": report.metrics.flesch_kincaid_grade,
                "automated_readability_index": report.metrics.automated_readability_index,
                "word_count": report.metrics.word_count,
                "sentence_count": report.metrics.sentence_count,
                "paragraph_count": report.metrics.paragraph_count,
                "avg_sentence_length": report.metrics.avg_sentence_length,
                "avg_word_length": report.metrics.avg_word_length,
                "complexity_score": report.metrics.complexity_score,
                "sentiment_score": report.metrics.sentiment_score,
                "overall_score": report.metrics.overall_score,
                "quality_level": report.metrics.quality_level.value,
            },
            "issues": [
                {
                    "category": issue.category.value,
                    "severity": issue.severity.value,
                    "message": issue.message,
                    "line_number": issue.line_number,
                    "column": issue.column,
                    "suggestion": issue.suggestion,
                    "rule_id": issue.rule_id,
                }
                for issue in report.issues
            ],
            "suggestions": report.suggestions,
            "previous_score": report.previous_score,
            "improvement": report.improvement,
        }

        if format.lower() == "yaml":
            return yaml.dump(data, default_flow_style=False)
        else:
            return json.dumps(data, indent=2, ensure_ascii=False)


class QualityManager:
    """品質管理メインクラス"""

    def __init__(self, rules: Optional[QualityRules] = None):
        self.rules = rules or QualityRules()
        self.checker = QualityChecker(self.rules)

        # SpaCyモデルを読み込み (Initialize nlp here)
        self.nlp = None
        try:
            self.nlp = spacy.load("en_core_web_sm")
        except OSError:
            logger.warning(
                "SpaCy English model not found. Install with: python -m spacy download en_core_web_sm"
            )

        self.analyzer = DocumentAnalyzer(nlp_model=self.nlp)  # Pass nlp model
        self.reports_history: Dict[str, List[QualityReport]] = {}


# CLI インターフェース
async def main():
    """メイン実行関数"""
    import argparse

    parser = argparse.ArgumentParser(description="Document Quality Manager")
    parser.add_argument("path", help="File or directory path to analyze")
    parser.add_argument(
        "--format", choices=["json", "yaml"], default="json", help="Output format"
    )
    parser.add_argument("--output", help="Output file path")
    parser.add_argument(
        "--summary", action="store_true", help="Generate summary report for directory"
    )

    args = parser.parse_args()

    manager = QualityManager()

    if Path(args.path).is_file():
        # 単一ファイル分析
        content = Path(args.path).read_text(encoding="utf-8")
        report = await manager.analyze_document(args.path, content)
        output = manager.export_report(report, args.format)

        if args.output:
            Path(args.output).write_text(output, encoding="utf-8")
        else:
            print(output)

    elif Path(args.path).is_dir():
        # ディレクトリ分析
        reports = await manager.analyze_directory(args.path)

        if args.summary:
            summary = manager.generate_summary_report(reports)
            output = json.dumps(summary, indent=2, ensure_ascii=False)
        else:
            output = json.dumps(
                [manager.export_report(report, "dict") for report in reports],
                indent=2,
                ensure_ascii=False,
            )

        if args.output:
            Path(args.output).write_text(output, encoding="utf-8")
        else:
            print(output)


if __name__ == "__main__":
    asyncio.run(main())
