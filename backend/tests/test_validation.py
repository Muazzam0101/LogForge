import pytest
from pydantic import ValidationError
from app.schemas.ingestion import LogProcessRequest, BatchLogProcessRequest


def test_validation_rejects_null_bytes():
    with pytest.raises(ValidationError) as exc:
        LogProcessRequest(raw_log="some log\x00corrupt")
    assert "null bytes" in str(exc.value)


def test_validation_rejects_pdf_stream():
    with pytest.raises(ValidationError) as exc:
        LogProcessRequest(raw_log="%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>")
    assert "PDF" in str(exc.value)


def test_validation_rejects_png_stream():
    with pytest.raises(ValidationError) as exc:
        LogProcessRequest(raw_log="\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR")
    assert "PNG" in str(exc.value) or "null bytes" in str(exc.value)


def test_batch_validation_rejects_binary():
    with pytest.raises(ValidationError) as exc:
        BatchLogProcessRequest(raw_logs=["valid log line", "%PDF-1.7 invalid"])
    assert "PDF" in str(exc.value)


def test_validation_accepts_valid_logs():
    req1 = LogProcessRequest(raw_log='{"timestamp": "2026-09-06T10:00:00Z", "src": "1.1.1.1"}')
    assert req1.raw_log is not None

    req2 = BatchLogProcessRequest(raw_logs=[
        '{"timestamp": "2026-09-06T10:00:00Z", "src": "1.1.1.1"}',
        'CEF:0|CheckPoint|VPN-1|1.0|drop|Drop packet|High|src=10.0.0.1'
    ])
    assert len(req2.raw_logs) == 2
