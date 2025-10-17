#!/usr/bin/env node
const { spawn } = require('child_process')
const path = require('path')

const scriptPath = path.join(__dirname, 'scripts', 'updateVacancyCounts.js')
const args = process.argv.slice(2)

const child = spawn(process.execPath, [scriptPath, ...args], { stdio: 'inherit' })

child.on('close', (code) => process.exit(code))
