@echo off
set issues=93 91 89 87 83 81 79 77 73 96 92 90 88 86 82 80 78 76
for %%i in (%issues%) do (
    echo Closing issue %%i
    gh issue close %%i
)
echo All issues closed.