# 前端命令可视化工具

描述：

能够自动收集项目中的`npm, gulp, fis`等命令，也可以自行添加npm相关命令（通过npm install安装的包提供的命令）

## 安装

克隆项目到本地

### 打开chrome

点击`右上角菜单 -> 更多工具 -> 扩展程序`

勾选`开发者模式`

将项目目录中的`app`文件夹拖放到扩展程序中

成功后，复制`frontend command`下的`ID`字段

进入项目目录`/host`

### mac下

编辑`com.colorbox.fecommand.json`文件

```json
{
  "name": "com.colorbox.fecommand",
  "description": "a native nodejs server for fecommand chrome extension",
  "path": "HOST_PATH",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://bfhmhkhcdgaodijpfpkaeimbcbommfgc/",
    "chrome-extension://将复制的ID字段粘贴在这里/"
  ]
}
```

点击执行`install_host.sh`

### windows下

编辑`com.colorbox.fecommand-win.json`文件

```json
{
  "name": "com.colorbox.fecommand",
  "description": "a native nodejs server for fecommand chrome extension",
  "path": "HOST_PATH",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://bfhmhkhcdgaodijpfpkaeimbcbommfgc/",
    "chrome-extension://将复制的ID字段粘贴在这里/"
  ]
}
```

点击执行`install_host.bat`