Set ws = CreateObject("WScript.Shell")
ws.CurrentDirectory = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
ws.Run """node_modules\electron\dist\electron.exe"" .", 0, False
