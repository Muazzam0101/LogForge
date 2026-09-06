from abc import ABC, abstractmethod
from typing import Any, Dict


class BaseParser(ABC):
    """Abstract Base Class for all LogForge ULPF log parsers.
    
    Any new vendor or format parser must inherit from this class and implement
    `can_parse` and `parse`. Adding new parsers to the framework never requires
    modifying existing parser logic.
    """

    parser_name: str
    supported_format: str
    version: str = "1.0.0"

    @abstractmethod
    def can_parse(self, raw_log: str) -> bool:
        """Determines whether this parser can handle the provided raw log string."""
        pass

    @abstractmethod
    def parse(self, raw_log: str) -> Dict[str, Any]:
        """Parses the raw log into an intermediate structured dictionary.
        
        Must extract available attributes and preserve all unmapped attributes.
        Raises ValueError if the log cannot be parsed.
        """
        pass
