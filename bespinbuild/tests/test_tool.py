from bespinbuild import tool

def test_manifest_creation():
    sample = """
    {
        "include_core_test": true,
        "plugins": ["Editor", "SimpleSyntax", "SimpleJavaScript"]
    }
"""
    manifest = tool.Manifest.from_json(sample)
    assert manifest.include_core_test