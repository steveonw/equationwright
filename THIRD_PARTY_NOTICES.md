# Third-party notices

## MathJax

The fully offline build embeds MathJax `tex-svg.js`. The copy in
`vendor/mathjax/tex-svg.js` was extracted from the project's existing offline
HTML build so future builds can reproduce the same dependency.

MathJax is distributed under the Apache License 2.0. Preserve the MathJax
copyright and license notices when redistributing an offline build.

Upstream project: https://www.mathjax.org/
Upstream source: https://github.com/mathjax/MathJax-src

## SymPy

The independent audit scripts use SymPy. SymPy is distributed under the BSD
3-Clause License. SymPy is installed as a development/test dependency and is
not embedded in the worksheet HTML.

Upstream project: https://www.sympy.org/
