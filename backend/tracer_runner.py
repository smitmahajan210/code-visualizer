"""
Python execution tracer – reads user code from stdin, runs it under sys.settrace,
and writes a JSON trace to stdout.
"""
import sys
import json
import traceback as tb

MAX_STEPS = 500

# Restricted builtins for user code execution – omits dangerous callables such
# as open, eval, exec, compile, __import__, breakpoint, etc.
_BUILTINS_WHITELIST = (
    "abs", "all", "any", "ascii", "bin", "bool", "bytearray", "bytes",
    "callable", "chr", "complex", "dict", "dir", "divmod", "enumerate",
    "filter", "float", "format", "frozenset", "getattr", "globals",
    "hasattr", "hash", "hex", "id", "int", "isinstance", "issubclass",
    "iter", "len", "list", "locals", "map", "max", "min", "next",
    "object", "oct", "ord", "pow", "print", "property", "range",
    "repr", "reversed", "round", "set", "slice", "sorted",
    "str", "sum", "super", "tuple", "type", "vars", "zip",
    # Exception types
    "ArithmeticError", "AssertionError", "AttributeError", "BaseException",
    "BufferError", "EOFError", "EnvironmentError", "Exception",
    "FileExistsError", "FileNotFoundError", "FloatingPointError",
    "GeneratorExit", "IOError", "ImportError", "IndentationError",
    "IndexError", "KeyError", "KeyboardInterrupt", "LookupError",
    "MemoryError", "ModuleNotFoundError", "NameError", "NotImplementedError",
    "OSError", "OverflowError", "RecursionError", "ReferenceError",
    "RuntimeError", "StopAsyncIteration", "StopIteration",
    "SyntaxError", "SystemError", "SystemExit", "TabError",
    "TimeoutError", "TypeError", "UnboundLocalError", "UnicodeDecodeError",
    "UnicodeEncodeError", "UnicodeError", "UnicodeTranslateError",
    "UserWarning", "ValueError", "Warning", "ZeroDivisionError",
    # Constants
    "False", "None", "True", "NotImplemented", "Ellipsis",
)

import builtins as _builtins_module  # noqa: E402

_SAFE_BUILTINS = {
    name: getattr(_builtins_module, name)
    for name in _BUILTINS_WHITELIST
    if hasattr(_builtins_module, name)
}


class _Capture:
    """Lightweight stdout capture (no StringIO dependency needed)."""

    def __init__(self):
        self._buf = []

    def write(self, s):
        self._buf.append(s)

    def flush(self):
        pass

    def get(self):
        return "".join(self._buf)


def _safe_repr(obj, depth=0):
    """Serialize a Python value to a JSON-safe dict for the frontend."""
    if depth > 2:
        return {"type": "...", "value": "..."}
    if obj is None:
        return {"type": "NoneType", "value": None}
    if isinstance(obj, bool):
        return {"type": "bool", "value": obj}
    if isinstance(obj, int):
        return {"type": "int", "value": obj}
    if isinstance(obj, float):
        return {"type": "float", "value": obj}
    if isinstance(obj, str):
        v = obj if len(obj) <= 200 else obj[:200] + "..."
        return {"type": "str", "value": v}
    if isinstance(obj, list):
        return {
            "type": "list",
            "id": id(obj),
            "value": [_safe_repr(x, depth + 1) for x in obj[:20]],
        }
    if isinstance(obj, tuple):
        return {
            "type": "tuple",
            "id": id(obj),
            "value": [_safe_repr(x, depth + 1) for x in obj[:20]],
        }
    if isinstance(obj, dict):
        return {
            "type": "dict",
            "id": id(obj),
            "value": {
                str(k): _safe_repr(v, depth + 1)
                for k, v in list(obj.items())[:20]
            },
        }
    if isinstance(obj, set):
        return {
            "type": "set",
            "id": id(obj),
            "value": [_safe_repr(x, depth + 1) for x in list(obj)[:20]],
        }
    try:
        r = repr(obj)
        return {"type": type(obj).__name__, "value": r[:200]}
    except Exception:
        return {"type": type(obj).__name__, "value": "..."}


def _build_call_stack(frame):
    stack = []
    f = frame
    while f is not None:
        if f.f_code.co_filename == "<user_code>":
            fvars = {}
            for k, v in list(f.f_locals.items()):
                if not k.startswith("__"):
                    try:
                        fvars[k] = _safe_repr(v)
                    except Exception:
                        fvars[k] = {"type": "error", "value": "?"}
            name = f.f_code.co_name
            stack.append(
                {
                    "funcName": "global" if name == "<module>" else name,
                    "line": f.f_lineno,
                    "locals": fvars,
                }
            )
        f = f.f_back
    stack.reverse()
    return stack


def main():
    user_code = sys.stdin.read()

    capture = _Capture()
    real_stdout = sys.stdout
    sys.stdout = capture

    steps = []
    step_count = [0]

    def tracer(frame, event, arg):
        if step_count[0] >= MAX_STEPS:
            return None
        if frame.f_code.co_filename != "<user_code>":
            return tracer
        if event not in ("line", "call", "return", "exception"):
            return tracer

        step_count[0] += 1

        step = {
            "event": event,
            "line": frame.f_lineno,
            "callStack": _build_call_stack(frame),
            "stdout": capture.get(),
        }

        if event == "exception" and arg:
            try:
                step["exceptionMsg"] = str(arg[1])
            except Exception:
                pass

        if event == "return":
            step["returnValue"] = _safe_repr(arg)

        steps.append(step)
        return tracer

    sys.settrace(tracer)
    error_msg = None
    try:
        code_obj = compile(user_code, "<user_code>", "exec")
        exec(  # noqa: S102
            code_obj,
            {
                "__name__": "__main__",
                # Restrict builtins to a safe subset – excludes open, __import__, eval, exec, etc.
                "__builtins__": _SAFE_BUILTINS,
            },
        )
    except SystemExit:
        pass
    except Exception:
        error_msg = tb.format_exc()
    finally:
        sys.settrace(None)
        sys.stdout = real_stdout

    result = {
        "steps": steps,
        "output": capture.get(),
        "error": error_msg,
        "truncated": step_count[0] >= MAX_STEPS,
    }

    real_stdout.write(json.dumps(result))
    real_stdout.flush()


if __name__ == "__main__":
    main()
