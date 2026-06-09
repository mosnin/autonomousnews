"""The writer prompt must not impersonate a fictional human reporter."""
from technotimes_agents.pipeline import WRITER_SYSTEM, WRITER_UPDATE_SYSTEM


def test_no_persona_format_slots():
    for prompt in (WRITER_SYSTEM, WRITER_UPDATE_SYSTEM):
        assert "{author_name}" not in prompt
        assert "{author_title}" not in prompt


def test_declares_autonomous_org_byline():
    assert "fully autonomous" in WRITER_SYSTEM
    assert "no human writer to roleplay" in WRITER_SYSTEM
    assert "Reported by Techno Times Agents" in WRITER_SYSTEM
