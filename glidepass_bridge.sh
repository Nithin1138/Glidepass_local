#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
"/Library/Frameworks/Python.framework/Versions/3.14/bin/python3" "$DIR/native_host.py" "$@"
