# GAM - Git Account Manager

[English](./docs/en.md) | 中文

## 安装

```shell
npm i -g gitam
```

## 使用

在终端输入 `gam -h` 或 `gitam -h` 查看全部指令。

推荐优先使用 `gam` 指令。但可能在您的设备上，`gam` 指令已被占用，此时可以使用 `gitam` 指令代替。

## 功能

- ✅ 查看全局/当前存储库 git 用户
- ✅ 设定全局/当前存储库 git 用户
- ✅ 管理常用的 git 用户
- ✅ 快速切换已存储的 git 用户
- ✅ 交互式添加、编辑账号
- ✅ 列表中标记当前 global/local 使用的账号
- ✅ 切换全局账号前确认，避免误切
- ✅ 支持 zsh/bash Shell 补全

## 例子

```shell
gam add github bob bob@email.com

gam add

gam edit github --email bob@new-email.com

gam add gitlab tom tom@email.com

gam use

gam use -g

gam completion zsh > ~/.gam-completion.zsh
echo 'source ~/.gam-completion.zsh' >> ~/.zshrc
```

## 命令

### 添加账号

可以一次性传入全部信息：

```shell
gam add github bob bob@email.com
```

也可以只输入 `gam add`，再按提示依次输入 username、email、flag。

当 flag 已存在时，命令会询问是否覆盖。非交互环境中不会自动覆盖，请使用新的 flag 或 `gam edit`。

### 编辑账号

```shell
gam edit github --username bob
gam edit github --email bob@new-email.com
gam edit github --flag github-work
```

至少需要提供一个选项。输入会自动去掉前后空格，并校验 flag、username 和 email。

### 切换账号

```shell
gam use github
gam use -g github
```

`gam use <flag>` 修改当前仓库配置。`gam use -g <flag>` 修改全局配置，执行前会显示当前全局账号和目标账号，并要求确认。

### 查看列表

```shell
gam list
```

列表会显示 `status` 列，用 `local`、`global` 或 `local,global` 标记当前正在使用的账号。

### 删除账号

```shell
gam remove github
gam remove 1
gam remove
```

可以通过 flag 或列表 index 删除账号。只输入 `gam remove` 时，会先显示账号列表，再按提示输入 index 或 flag。

### Shell 补全

```shell
gam completion zsh > ~/.gam-completion.zsh
echo 'source ~/.gam-completion.zsh' >> ~/.zshrc
```

或：

```shell
gam completion bash > ~/.gam-completion.bash
echo 'source ~/.gam-completion.bash' >> ~/.bashrc
```

补全脚本会补全命令名，并为 `use`、`edit`、`remove` 补全已保存的账号 flag。
