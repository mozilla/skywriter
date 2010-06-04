#!/usr/bin/env python

# Simple script to run dryice conveniently in the Customizable package

import sys
import os

mydir = os.path.dirname(__file__)
sys.path.insert(0, os.path.join(mydir, "lib"))

from dryice import tool
tool.main()
