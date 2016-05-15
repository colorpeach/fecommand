
#!/bin/bash -l

ROOT_PATH="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
SCRIPT_PATH="$(echo $ROOT_PATH)/host/native-messaging-host.js"

exec $NODE $SCRIPT_PATH