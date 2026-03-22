"""Config loader — leest config.yaml vanuit de repo root."""
from pathlib import Path
import yaml

_config: dict | None = None


def load_config() -> dict:
    global _config
    if _config is None:
        config_path = Path(__file__).parent.parent.parent / "config.yaml"
        with open(config_path, encoding="utf-8") as f:
            _config = yaml.safe_load(f)
    return _config


def get_my_teams(config: dict) -> list[dict]:
    """Geeft primair en secundair team terug als lijst."""
    return [config["my_teams"]["primary"], config["my_teams"]["secondary"]]


def get_team_abbrs(config: dict) -> list[str]:
    return [t["abbr"] for t in get_my_teams(config)]
