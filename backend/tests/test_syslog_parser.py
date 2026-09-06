from app.parsers.syslog_parser import SyslogParser


def test_syslog_parser_can_parse(sample_syslog_rfc5424, sample_syslog_rfc3164):
    parser = SyslogParser()
    assert parser.can_parse(sample_syslog_rfc5424) is True
    assert parser.can_parse(sample_syslog_rfc3164) is True
    assert parser.can_parse("just a random text message") is False


def test_syslog_parser_rfc5424(sample_syslog_rfc5424):
    parser = SyslogParser()
    extracted = parser.parse(sample_syslog_rfc5424)

    assert extracted["priority"] == 165
    assert extracted["facility"] == 165 // 8  # 20
    assert extracted["severity_code"] == 165 % 8  # 5
    assert extracted["hostname"] == "border-gw.ntro.in"
    assert extracted["app_name"] == "cisco-asa"
    assert extracted["process_id"] == "12345"
    assert extracted["msg_id"] == "ID47"
    assert "Deny tcp src 10.10.10.5:4432" in extracted["message"]


def test_syslog_parser_rfc3164(sample_syslog_rfc3164):
    parser = SyslogParser()
    extracted = parser.parse(sample_syslog_rfc3164)

    assert extracted["priority"] == 34
    assert extracted["facility"] == 34 // 8  # 4
    assert extracted["severity_code"] == 34 % 8  # 2
    assert extracted["hostname"] == "secure-server"
    assert extracted["app_name"] == "sshd"
    assert extracted["process_id"] == "4912"
    assert "Failed password for invalid user" in extracted["message"]


def test_syslog_embedded_kv_extraction():
    parser = SyslogParser()
    log = "<134>Sep 6 10:30:00 fw1 kernel: IN=eth0 OUT=eth1 SRC=192.168.1.10 DST=8.8.8.8 PROTO=UDP SPT=53000 DPT=53 ACTION=ALLOW"
    extracted = parser.parse(log)

    assert extracted["src"] == "192.168.1.10"
    assert extracted["dst"] == "8.8.8.8"
    assert extracted["proto"] == "UDP"
    assert extracted["spt"] == "53000"
    assert extracted["dpt"] == "53"
    assert extracted["action"] == "ALLOW"
