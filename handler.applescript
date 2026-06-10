
    on open location theURL
        if theURL contains "start" then
            do shell script "cd /Users/nithin/Projects/LANpad && python3 launcher.py --auto-start > /dev/null 2>&1 &"
        end if
    end open location
    