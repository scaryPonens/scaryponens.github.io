---
title: "Unlock Your Terminal's Clipboard: Introducing termco-py"
tldr: Pipe any file from a remote terminal to your local clipboard with one command. A lightweight Python CLI using OSC 52.
---

# Unlock Your Terminal's Clipboard: Introducing termco-py

As developers, we often find ourselves working in remote environments like Kubernetes pods or EC2 instances. A common challenge is moving data, especially large files, from these remote systems to our local clipboard. While tools like `scp` or SSH tunnels are great, they aren't always available or convenient, particularly in restricted or temporary environments. Opening a multi-megabyte log file in `vim` just to copy its contents can be slow and memory-intensive.

What if you could pipe any file, no matter how large, directly to your local clipboard from a remote terminal with a single command?

Enter `termco-py`, a lightweight Python CLI tool designed to solve this exact problem.

## What is `termco-py`?

`termco-py` is a simple yet powerful utility that sends file contents or piped data to your local machine's clipboard using terminal escape sequences (specifically, OSC 52). This means you can copy data from a remote session without needing an active SSH tunnel for clipboard sharing or loading the entire file into an editor. It's fast, efficient, and works in any terminal that supports OSC 52, such as iTerm2, Alacritty, or WezTerm.

## Getting Started

Installation is as simple as running pip:

```bash
pip install termcopy
```

## How to Use It

`termco-py` is designed to be intuitive and fit naturally into your existing command-line workflows.

### Copying a File

To copy the entire contents of a file, just pass the filename to `termcopy`:

```bash
termcopy /var/log/really_large_log_file.log
```

The content is now in your local clipboard, ready to be pasted anywhere you need it.

### Piping from Other Commands

The real power of `termco-py` shines when combined with other tools. You can pipe the output of any command directly into it.

Want to copy the last 100 lines of a log?
```bash
tail -n 100 my-app.log | termcopy
```

Need to grab the YAML definition of a running Kubernetes pod?
```bash
kubectl get pod my-pod -o yaml | termcopy
```

Or maybe you just want to quickly share a snippet of text:
```bash
echo "Hello from the remote server!" | termcopy
```

## How It Works Under the Hood

The magic behind `termco-py` is the **OSC 52 escape sequence**. Here's a quick rundown of the process:

1.  **Read Input:** The tool reads data either from a file specified as an argument or from standard input (`stdin`) if it's part of a pipe.
2.  **Encode:** The input data is encoded in Base64. This ensures that any special characters or binary data can be safely transmitted.
3.  **Construct the Sequence:** The Base64 string is wrapped in the OSC 52 escape sequence, which looks something like this: `\x1b]52;c;BASE64_STRING\x07`.
4.  **Print to Terminal:** The tool prints this final sequence to standard output. Your terminal emulator sees this special sequence and interprets it as a command to update the system clipboard with the decoded Base64 data.

This approach avoids the need for complex networking or loading large amounts of data into memory, making it a highly efficient solution for a common problem.

## Inspiration

This project is a Python alternative to my friend Trevor Bernard's Rust implementation, which demonstrated the power and elegance of using OSC 52 escape sequences for clipboard operations in terminal environments. You can find his project at [trevorbernard/termcopy](https://github.com/trevorbernard/termcopy).

## Give it a Try!

Next time you're deep in a remote session and need to get data back to your local machine, give `termco-py` a try. It's a simple tool that can save you a surprising amount of time and hassle.

Check out the project on GitHub at [scaryPonens/termco-py](https://github.com/scaryPonens/termco-py) to see the source code, and feel free to contribute!
