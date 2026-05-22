#!/usr/bin/env python3
"""
GMI Cloud Inference Engine connection test.
Verify all 4 models respond correctly before the demo.
Run: python scripts/test_gmi_connection.py
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from gmi_client import gmi


async def main():
    print("=" * 60)
    print("  GMI Cloud Inference Engine — Connection Test")
    print("=" * 60)

    tests = [
        ("Translation (Gemini 2.5 Flash)", lambda: gmi.translate(
            "你好，这是GMI Cloud连接测试。", "zh", "en", {"GMI Cloud": "GMI Cloud"}
        )),
        ("Document Structure (GLM-4)", lambda: gmi.analyze_structure(
            "# 产品规格\n## 硬件参数\n- 芯片：M4\n- 内存：16GB"
        )),
        ("Embedding (Qwen3-Embedding)", lambda: gmi.embed_single("GMI Cloud inference test")),
        ("RAG QA (DeepSeek V3)", lambda: gmi.ask_with_context(
            "What is GMI Cloud?", ["GMI Cloud is an AI-native cloud service provider."]
        )),
    ]

    results = []
    for name, test_fn in tests:
        try:
            print(f"\n  Testing {name}...")
            result = await test_fn()
            if isinstance(result, dict):
                keys = [k for k in result if k != "answer"]
                status = f"OK — {result.get('latency_ms', '?')}ms, {result.get('tokens_input', 0)}+{result.get('tokens_output', 0)} tokens"
            elif isinstance(result, list):
                status = f"OK — {len(result)}-dim vector"
            else:
                status = "OK"
            print(f"    ✓ {status}")
            results.append((name, True, status))
        except Exception as e:
            print(f"    ✗ FAILED: {e}")
            results.append((name, False, str(e)))

    print("\n" + "=" * 60)
    passed = sum(1 for _, ok, _ in results if ok)
    print(f"  Results: {passed}/{len(results)} models responding")
    if passed == len(results):
        print("  ✓ All GMI Cloud models operational — ready for demo!")
    else:
        print("  ⚠ Some models failed — check API key and model names in config.py")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
