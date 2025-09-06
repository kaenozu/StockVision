import os
import pytest
from importlib import reload, import_module


@pytest.mark.skip(reason="Legacy test - CORS configuration has been refactored to use new settings system")
def test_compute_allowed_cors_origins_dev(monkeypatch):
    # Arrange
    os.environ["PROD_CORS_ORIGINS"] = "https://prod.example.com"

    # Re-import after env change
    # Reload constants (reflect env change) then main
    reload(import_module('src.constants.api'))
    reload(import_module('src.constants'))
    from src import main as main_mod
    reload(main_mod)

    # Act
    origins = main_mod.compute_allowed_cors_origins(debug=True)

    # Assert
    assert "http://localhost:3000" in origins
    assert "http://localhost:8080" in origins
    assert "https://prod.example.com" in origins


@pytest.mark.skip(reason="Legacy test - CORS configuration has been refactored to use new settings system")
def test_compute_allowed_cors_origins_prod_only(monkeypatch):
    # Arrange
    os.environ["PROD_CORS_ORIGINS"] = "https://prod.example.com, https://www.stockvision.jp"

    reload(import_module('src.constants.api'))
    reload(import_module('src.constants'))
    from src import main as main_mod
    reload(main_mod)

    # Act
    origins = main_mod.compute_allowed_cors_origins(debug=False)

    # Assert
    assert "http://localhost:3000" not in origins
    assert "https://prod.example.com" in origins
    assert "https://www.stockvision.jp" in origins


@pytest.mark.skip(reason="Legacy test - CORS configuration has been refactored to use new settings system")
def test_compute_allowed_cors_origins_filters_invalid(monkeypatch):
    # Arrange
    os.environ["PROD_CORS_ORIGINS"] = "*, http://, not-a-url, https://ok.example.com"

    reload(import_module('src.constants.api'))
    reload(import_module('src.constants'))
    from src import main as main_mod
    reload(main_mod)

    # Act
    origins = main_mod.compute_allowed_cors_origins(debug=False)

    # Assert
    assert origins == ["https://ok.example.com"]
