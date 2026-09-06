from typing import Dict, List, Optional, Tuple
from .base import BaseParser
from .detector import FormatDetector
from .json_parser import JSONParser
from .cef_parser import CEFParser
from .syslog_parser import SyslogParser


class ParserRegistry:
    """Plugin-style Registry managing all available log parsers in LogForge.
    
    New vendor-specific or format parsers can be registered dynamically
    without changing any downstream processing service or API code.
    """

    def __init__(self) -> None:
        self._parsers: Dict[str, BaseParser] = {}
        self._format_mapping: Dict[str, BaseParser] = {}
        self._register_builtins()

    def _register_builtins(self) -> None:
        """Registers default core parsers for JSON, CEF, and Syslog."""
        self.register(JSONParser())
        self.register(CEFParser())
        self.register(SyslogParser())

    def register(self, parser: BaseParser) -> None:
        """Registers a new parser plugin into the registry."""
        self._parsers[parser.parser_name] = parser
        self._format_mapping[parser.supported_format.lower()] = parser

    def get_parser(self, name: str) -> Optional[BaseParser]:
        """Retrieves a parser by its unique name."""
        return self._parsers.get(name)

    def get_parser_for_format(self, format_name: str) -> Optional[BaseParser]:
        """Retrieves the default parser mapped to a given format."""
        return self._format_mapping.get(format_name.lower())

    def detect_and_select_parser(self, raw_log: str) -> Tuple[Optional[BaseParser], str]:
        """Runs deterministic format detection and resolves the appropriate parser.
        
        Returns:
            (parser, detected_format)
        """
        detected_format = FormatDetector.detect(raw_log)
        if detected_format == "unknown":
            return None, "unknown"

        parser = self.get_parser_for_format(detected_format)
        return parser, detected_format

    def list_parsers(self) -> List[str]:
        """Returns the list of currently registered parser names."""
        return sorted(list(self._parsers.keys()))


# Global singleton registry instance
parser_registry = ParserRegistry()
