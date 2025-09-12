"""
Model Version Management

This module provides comprehensive model version management capabilities
for tracking, storing, and deploying different versions of machine learning models.
It integrates with MLflow for experiment tracking and model registry.
"""

import hashlib
import json
import logging
import os
from dataclasses import asdict, dataclass
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

import joblib
import pandas as pd

# MLflow integration
try:
    import mlflow
    import mlflow.pytorch
    import mlflow.sklearn
    # from mlflow.entities import ViewType # Commented out as it's unused
    from mlflow.tracking import MlflowClient

    MLFLOW_AVAILABLE = True
except ImportError:
    MLFLOW_AVAILABLE = False
    print(
        "MLflow not available. Install with 'pip install mlflow' for full functionality."
    )

logger = logging.getLogger(__name__)


class ModelStage(Enum):
    """Model deployment stages"""

    NONE = "None"
    STAGING = "Staging"
    PRODUCTION = "Production"
    ARCHIVED = "Archived"


@dataclass
class ModelVersion:
    """Model version information"""

    version: str
    model_name: str
    stage: ModelStage
    created_at: datetime
    metrics: Dict[str, float]
    parameters: Dict[str, Any]
    tags: Dict[str, str]
    run_id: Optional[str] = None
    artifact_uri: Optional[str] = None
    description: Optional[str] = None


@dataclass
class ModelMetadata:
    """Model metadata for versioning"""

    model_name: str
    version: str
    framework: str  # "sklearn", "pytorch", "tensorflow", etc.
    model_type: str  # "random_forest", "lstm", etc.
    created_at: datetime
    trained_at: datetime
    dataset_hash: str
    feature_names: List[str]
    target_name: str
    input_shape: Optional[Tuple[int, ...]] = None
    output_shape: Optional[Tuple[int, ...]] = None
    description: Optional[str] = None
    author: Optional[str] = None


@dataclass
class VersioningConfig:
    """Configuration for model versioning"""

    tracking_uri: str = "./mlruns"  # Local MLflow tracking URI
    registry_uri: str = "./mlruns"  # Local MLflow registry URI
    experiment_name: str = "stock_prediction"
    default_stage: ModelStage = ModelStage.NONE
    enable_mlflow: bool = True
    local_storage_path: str = "./models"
    backup_storage_path: Optional[str] = None


class ModelVersionManager:
    """Manages model versions, tracking, and deployment stages"""

    def __init__(self, config: Optional[VersioningConfig] = None):
        self.config = config or VersioningConfig()
        self.client = None
        self.local_versions: Dict[str, List[ModelVersion]] = {}

        # Setup MLflow if available and enabled
        if self.config.enable_mlflow and MLFLOW_AVAILABLE:
            self._setup_mlflow()

        # Create local storage directory
        os.makedirs(self.config.local_storage_path, exist_ok=True)
        if self.config.backup_storage_path:
            os.makedirs(self.config.backup_storage_path, exist_ok=True)

    def _setup_mlflow(self):
        """Setup MLflow tracking and registry"""
        try:
            mlflow.set_tracking_uri(self.config.tracking_uri)
            mlflow.set_registry_uri(self.config.registry_uri)

            # Set experiment
            mlflow.set_experiment(self.config.experiment_name)

            # Create client
            self.client = MlflowClient()

            logger.info(
                f"MLflow setup completed. Tracking URI: {self.config.tracking_uri}"
            )

        except Exception as e:
            logger.error(f"Failed to setup MLflow: {e}")
            self.client = None

    def create_model_version(
        self,
        model: Any,
        model_name: str,
        metrics: Dict[str, float],
        parameters: Dict[str, Any],
        dataset: Optional[pd.DataFrame] = None,
        feature_names: Optional[List[str]] = None,
        target_name: Optional[str] = None,
        description: Optional[str] = None,
        tags: Optional[Dict[str, str]] = None,
        framework: str = "sklearn",
    ) -> ModelVersion:
        """Create a new model version"""
        try:
            # Generate version string
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            version = f"v{timestamp}"

            # Create model metadata
            dataset_hash = (
                self._compute_dataset_hash(dataset)
                if dataset is not None
                else "unknown"
            )

            metadata = ModelMetadata(
                model_name=model_name,
                version=version,
                framework=framework,
                model_type=self._get_model_type(model),
                created_at=datetime.now(),
                trained_at=datetime.now(),
                dataset_hash=dataset_hash,
                feature_names=feature_names or [],
                target_name=target_name or "target",
                description=description,
                author=os.getenv("USER", "unknown"),
            )

            # Save model locally
            # local_path = self._save_model_locally(model, metadata) # Commented out as it's unused

            # Log to MLflow if available
            run_id = None
            artifact_uri = None
            if self.client and self.config.enable_mlflow:
                run_id, artifact_uri = self._log_to_mlflow(
                    model, model_name, version, metrics, parameters, tags, metadata
                )

            # Create model version
            model_version = ModelVersion(
                version=version,
                model_name=model_name,
                stage=self.config.default_stage,
                created_at=datetime.now(),
                metrics=metrics,
                parameters=parameters,
                tags=tags or {},
                run_id=run_id,
                artifact_uri=artifact_uri,
                description=description,
            )

            # Store version tracking
            if model_name not in self.local_versions:
                self.local_versions[model_name] = []
            self.local_versions[model_name].append(model_version)

            logger.info(f"Created model version {version} for {model_name}")
            return model_version

        except Exception as e:
            logger.error(f"Failed to create model version for {model_name}: {e}")
            raise

    def _compute_dataset_hash(self, dataset: pd.DataFrame) -> str:
        """Compute hash of dataset for version tracking"""
        try:
            # Convert to string and hash
            dataset_str = dataset.to_string().encode("utf-8")
            return hashlib.md5(dataset_str).hexdigest()
        except Exception as e:
            logger.warning(f"Failed to compute dataset hash: {e}")
            return "unknown"

    def _get_model_type(self, model: Any) -> str:
        """Get model type from model object"""
        model_class = model.__class__.__name__.lower()

        # Map common model types
        type_mapping = {
            "randomforestregressor": "random_forest",
            "gradientboostingregressor": "gradient_boosting",
            "linearregression": "linear_regression",
            "ridge": "ridge_regression",
            "lstmmodel": "lstm",
            "grumodel": "gru",
        }

        return type_mapping.get(model_class, model_class)

    def _save_model_locally(self, model: Any, metadata: ModelMetadata) -> str:
        """Save model to local storage"""
        try:
            # Create directory for model
            model_dir = os.path.join(
                self.config.local_storage_path, metadata.model_name
            )
            os.makedirs(model_dir, exist_ok=True)

            # Save model
            model_path = os.path.join(model_dir, f"{metadata.version}.joblib")
            joblib.dump(model, model_path)

            # Save metadata
            metadata_path = os.path.join(model_dir, f"{metadata.version}_metadata.json")
            with open(metadata_path, "w") as f:
                json.dump(asdict(metadata), f, indent=2, default=str)

            logger.info(f"Model saved locally: {model_path}")
            return model_path

        except Exception as e:
            logger.error(f"Failed to save model locally: {e}")
            raise

    def _log_to_mlflow(
        self,
        model: Any,
        model_name: str,
        version: str,
        metrics: Dict[str, float],
        parameters: Dict[str, Any],
        tags: Optional[Dict[str, str]],
        metadata: ModelMetadata,
    ) -> Tuple[str, str]:
        """Log model to MLflow"""
        try:
            with mlflow.start_run(run_name=f"{model_name}_{version}") as run:
                run_id = run.info.run_id

                # Log metrics
                mlflow.log_metrics(metrics)

                # Log parameters
                mlflow.log_params(parameters)

                # Log tags
                if tags:
                    mlflow.set_tags(tags)

                # Log metadata as tags
                mlflow.set_tag("model_name", model_name)
                mlflow.set_tag("version", version)
                mlflow.set_tag("framework", metadata.framework)
                mlflow.set_tag("model_type", metadata.model_type)
                mlflow.set_tag("dataset_hash", metadata.dataset_hash)
                mlflow.set_tag("author", metadata.author)

                # Log model based on framework
                if metadata.framework == "sklearn":
                    mlflow.sklearn.log_model(model, "model")
                elif metadata.framework in ["pytorch", "lstm", "gru"]:
                    mlflow.pytorch.log_model(model, "model")
                else:
                    # Generic model logging
                    mlflow.log_artifact(self._save_model_locally(model, metadata))

                artifact_uri = run.info.artifact_uri

                # Register model
                try:
                    model_uri = f"runs:/{run_id}/model"
                    mv = mlflow.register_model(model_uri, model_name)

                    # Update model version stage
                    if self.config.default_stage != ModelStage.NONE:
                        self.client.transition_model_version_stage(
                            name=model_name,
                            version=mv.version,
                            stage=self.config.default_stage.value,
                        )
                except Exception as e:
                    logger.warning(f"Failed to register model in MLflow registry: {e}")

                return run_id, artifact_uri

        except Exception as e:
            logger.error(f"Failed to log to MLflow: {e}")
            return None, None

    def get_model_versions(self, model_name: str) -> List[ModelVersion]:
        """Get all versions of a model"""
        # Check local versions first
        if model_name in self.local_versions:
            return self.local_versions[model_name]

        # Check MLflow if available
        if self.client and self.config.enable_mlflow:
            try:
                latest_versions = self.client.get_latest_versions(model_name)
                versions = []
                for mv in latest_versions:
                    version = ModelVersion(
                        version=mv.version,
                        model_name=mv.name,
                        stage=ModelStage(mv.current_stage),
                        created_at=datetime.fromtimestamp(mv.creation_timestamp / 1000),
                        metrics={},  # Would need to fetch from run
                        parameters={},  # Would need to fetch from run
                        tags=mv.tags,
                        run_id=mv.run_id,
                        artifact_uri=mv.source,
                        description=mv.description,
                    )
                    versions.append(version)
                return versions
            except Exception as e:
                logger.warning(f"Failed to fetch versions from MLflow: {e}")

        return []

    def get_model_version(
        self, model_name: str, version: str
    ) -> Optional[ModelVersion]:
        """Get specific version of a model"""
        versions = self.get_model_versions(model_name)
        for v in versions:
            if v.version == version:
                return v
        return None

    def transition_model_version_stage(
        self, model_name: str, version: str, stage: ModelStage
    ) -> bool:
        """Transition model version to new stage"""
        try:
            # Update local tracking
            model_version = self.get_model_version(model_name, version)
            if model_version:
                model_version.stage = stage

            # Update MLflow if available
            if self.client and self.config.enable_mlflow:
                self.client.transition_model_version_stage(
                    name=model_name, version=version, stage=stage.value
                )

            logger.info(f"Transitioned {model_name} version {version} to {stage.value}")
            return True

        except Exception as e:
            logger.error(f"Failed to transition model version stage: {e}")
            return False

    def load_model(self, model_name: str, version: str) -> Any:
        """Load specific version of a model"""
        try:
            # Try to load from local storage first
            model_dir = os.path.join(self.config.local_storage_path, model_name)
            model_path = os.path.join(model_dir, f"{version}.joblib")

            if os.path.exists(model_path):
                model = joblib.load(model_path)
                logger.info(
                    f"Loaded model {model_name} version {version} from local storage"
                )
                return model

            # Try to load from MLflow if available
            if self.client and self.config.enable_mlflow:
                try:
                    model_uri = f"models:/{model_name}/{version}"
                    model = mlflow.pyfunc.load_model(model_uri)
                    logger.info(
                        f"Loaded model {model_name} version {version} from MLflow"
                    )
                    return model
                except Exception as e:
                    logger.warning(f"Failed to load model from MLflow: {e}")

            raise FileNotFoundError(f"Model {model_name} version {version} not found")

        except Exception as e:
            logger.error(f"Failed to load model {model_name} version {version}: {e}")
            raise

    def delete_model_version(self, model_name: str, version: str) -> bool:
        """Delete specific version of a model"""
        try:
            # Remove from local tracking
            if model_name in self.local_versions:
                self.local_versions[model_name] = [
                    v for v in self.local_versions[model_name] if v.version != version
                ]

            # Remove local files
            model_dir = os.path.join(self.config.local_storage_path, model_name)
            model_path = os.path.join(model_dir, f"{version}.joblib")
            metadata_path = os.path.join(model_dir, f"{version}_metadata.json")

            if os.path.exists(model_path):
                os.remove(model_path)
            if os.path.exists(metadata_path):
                os.remove(metadata_path)

            # Delete from MLflow if available
            if self.client and self.config.enable_mlflow:
                try:
                    self.client.delete_model_version(model_name, version)
                except Exception as e:
                    logger.warning(f"Failed to delete model version from MLflow: {e}")

            logger.info(f"Deleted model {model_name} version {version}")
            return True

        except Exception as e:
            logger.error(f"Failed to delete model version: {e}")
            return False

    def get_production_model(
        self, model_name: str
    ) -> Optional[Tuple[Any, ModelVersion]]:
        """Get the production version of a model"""
        try:
            # Check local versions
            if model_name in self.local_versions:
                for version in self.local_versions[model_name]:
                    if version.stage == ModelStage.PRODUCTION:
                        model = self.load_model(model_name, version.version)
                        return model, version

            # Check MLflow if available
            if self.client and self.config.enable_mlflow:
                try:
                    latest_versions = self.client.get_latest_versions(
                        model_name, stages=["Production"]
                    )
                    if latest_versions:
                        mv = latest_versions[0]
                        model_uri = f"models:/{model_name}/{mv.version}"
                        model = mlflow.pyfunc.load_model(model_uri)
                        version = ModelVersion(
                            version=mv.version,
                            model_name=mv.name,
                            stage=ModelStage(mv.current_stage),
                            created_at=datetime.fromtimestamp(
                                mv.creation_timestamp / 1000
                            ),
                            metrics={},
                            parameters={},
                            tags=mv.tags,
                            run_id=mv.run_id,
                            artifact_uri=mv.source,
                            description=mv.description,
                        )
                        return model, version
                except Exception as e:
                    logger.warning(f"Failed to fetch production model from MLflow: {e}")

            return None

        except Exception as e:
            logger.error(f"Failed to get production model: {e}")
            return None

    def list_models(self) -> List[str]:
        """List all available models"""
        models = set()

        # Add local models
        models.update(self.local_versions.keys())

        # Add MLflow models if available
        if self.client and self.config.enable_mlflow:
            try:
                registered_models = self.client.list_registered_models()
                models.update([model.name for model in registered_models])
            except Exception as e:
                logger.warning(f"Failed to list MLflow models: {e}")

        return list(models)

    def get_model_metadata(
        self, model_name: str, version: str
    ) -> Optional[ModelMetadata]:
        """Get metadata for specific model version"""
        try:
            # Try to load from local storage
            model_dir = os.path.join(self.config.local_storage_path, model_name)
            metadata_path = os.path.join(model_dir, f"{version}_metadata.json")

            if os.path.exists(metadata_path):
                with open(metadata_path, "r") as f:
                    metadata_dict = json.load(f)
                    # Convert datetime strings back to datetime objects
                    metadata_dict["created_at"] = datetime.fromisoformat(
                        metadata_dict["created_at"]
                    )
                    metadata_dict["trained_at"] = datetime.fromisoformat(
                        metadata_dict["trained_at"]
                    )
                    return ModelMetadata(**metadata_dict)

            # Try to get from MLflow if available
            if self.client and self.config.enable_mlflow:
                try:
                    # This would require fetching run information
                    pass
                except Exception as e:
                    logger.warning(f"Failed to fetch metadata from MLflow: {e}")

            return None

        except Exception as e:
            logger.error(f"Failed to get model metadata: {e}")
            return None

    def backup_models(self) -> bool:
        """Backup all models to backup storage"""
        if not self.config.backup_storage_path:
            logger.warning("No backup storage path configured")
            return False

        try:
            import shutil

            # Copy local storage to backup
            if os.path.exists(self.config.local_storage_path):
                backup_path = os.path.join(
                    self.config.backup_storage_path,
                    f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                )
                shutil.copytree(self.config.local_storage_path, backup_path)
                logger.info(f"Models backed up to {backup_path}")
                return True

            return False

        except Exception as e:
            logger.error(f"Failed to backup models: {e}")
            return False


# Global model version manager instance
versioning_config = VersioningConfig()
model_version_manager = ModelVersionManager(versioning_config)


# Context manager for MLflow runs
class MLflowContext:
    """Context manager for MLflow runs"""

    def __init__(self, experiment_name: str, run_name: str):
        self.experiment_name = experiment_name
        self.run_name = run_name
        self.run = None

    def __enter__(self):
        if MLFLOW_AVAILABLE and model_version_manager.config.enable_mlflow:
            try:
                mlflow.set_experiment(self.experiment_name)
                self.run = mlflow.start_run(run_name=self.run_name)
                return self.run
            except Exception as e:
                logger.error(f"Failed to start MLflow run: {e}")
                return None
        return None

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.run and MLFLOW_AVAILABLE and model_version_manager.config.enable_mlflow:
            try:
                mlflow.end_run()
            except Exception as e:
                logger.error(f"Failed to end MLflow run: {e}")


# Example usage functions
def create_sample_model_version():
    """Create a sample model version for demonstration"""
    try:
        from sklearn.datasets import make_regression
        from sklearn.ensemble import RandomForestRegressor

        # Create sample model
        X, y = make_regression(
            n_samples=1000, n_features=10, noise=0.1, random_state=42
        )
        model = RandomForestRegressor(n_estimators=100, random_state=42)
        model.fit(X, y)

        # Create sample dataset
        feature_names = [f"feature_{i}" for i in range(10)]
        dataset = pd.DataFrame(X, columns=feature_names)
        dataset["target"] = y

        # Create metrics and parameters
        metrics = {"r2": 0.95, "mse": 0.01, "mae": 0.05}

        parameters = {"n_estimators": 100, "max_depth": 10, "random_state": 42}

        # Create model version
        model_version = model_version_manager.create_model_version(
            model=model,
            model_name="sample_stock_predictor",
            metrics=metrics,
            parameters=parameters,
            dataset=dataset,
            feature_names=feature_names,
            target_name="target",
            description="Sample stock price prediction model",
            tags={"environment": "development", "team": "ml"},
            framework="sklearn",
        )

        print(f"Created model version: {model_version.version}")
        return model_version

    except Exception as e:
        logger.error(f"Error creating sample model version: {e}")
        raise


def list_available_models():
    """List all available models"""
    try:
        models = model_version_manager.list_models()
        print("Available models:")
        for model in models:
            print(f"  - {model}")
        return models
    except Exception as e:
        logger.error(f"Error listing models: {e}")
        raise


if __name__ == "__main__":
    # Create sample model version
    model_version = create_sample_model_version()

    # List available models
    list_available_models()

    # Get model versions
    versions = model_version_manager.get_model_versions("sample_stock_predictor")
    print(f"Versions for sample_stock_predictor: {len(versions)}")

    # Load model
    if versions:
        model, version_info = model_version_manager.get_production_model(
            "sample_stock_predictor"
        )
        if model:
            print(f"Loaded production model: {version_info.version}")
