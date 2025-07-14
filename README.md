WFLY Messenger Client (Node.js)
A self-contained, all-in-one messenger client built with Node.js. This application runs a local server to provide a web-based chat interface and connects to the WFLY Messenger backend via WebSockets for real-time communication.

Features
All-in-One File: The entire application—backend server, web interface (HTML, CSS, JS), and client logic—is contained within a single client.js file.

Console-Based Authentication: Securely log in or register a new account directly from your terminal.

Persistent Sessions: User sessions are saved locally, so you don't have to log in every time.

Real-Time Chat: Uses WebSockets for instant message delivery, online status updates, and typing indicators.

Modern Web Interface: A clean, responsive, and dark-mode UI for a great user experience.

User Search: Easily find and start conversations with other registered users.

Multi-Language Support: Switch between English, Russian, and Italian on the fly.

Auto-Launch: The included start.bat script automatically opens the messenger in your default web browser.

Smart Chat Sorting: Chats are automatically sorted, with the most recent conversations appearing at the top.

Prerequisites
Before you begin, ensure you have the following installed on your system:

Node.js (which includes npm, the Node Package Manager). Version 14.x or higher is recommended.

Installation & Usage
Getting started is simple. Just follow these steps:

Clone the Repository

git clone https://github.com/olar00nd/wfly-anonymity.git
cd wfly-anonymity

Run the Application

The easiest way to run the client on Windows is to use the provided batch script.

Simply double-click the start.bat file.

This script will automatically:

Install all the necessary dependencies (express, axios, inquirer, etc.).

Start the Node.js server.

Launch the messenger interface in your default web browser.

Alternatively, you can run it manually from your terminal:

# 1. Install dependencies
npm install

# 2. Run the client
node client.js

Log In or Register

The first time you run the client, you will be prompted in the terminal to Login or Register.

Follow the on-screen instructions to create an account or sign in.

Once authenticated, the web interface will open automatically.

How It Works
This project combines a backend and a frontend into one script for simplicity and portability.

Node.js & Express: A lightweight Express server is created to serve the main HTML file and provide an API endpoint for the frontend to fetch the authentication token.

Inquirer: This package is used to create the interactive command-line prompts for login and registration.

Axios: Used to make HTTP requests to the main WFLY API for user authentication.

WebSockets: The core of the real-time communication. The client connects to the wss://api.wfly.me:5542 server to send and receive messages, status updates, and other events.

Single-File Interface: The getHtmlInterface() function in client.js returns a template literal containing the entire HTML structure, CSS styles, and frontend JavaScript logic. This makes the project completely self-contained.

License
This project is licensed under the MIT License. See the LICENSE file for details.
