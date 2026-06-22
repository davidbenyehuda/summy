from dataclasses import dataclass


@dataclass
class InMemoryUpload:
    filename: str
    data: bytes
    content_type: str | None = None

    def clear(self) -> None:
        self.data = b""

    @property
    def size_bytes(self) -> int:
        return len(self.data)
