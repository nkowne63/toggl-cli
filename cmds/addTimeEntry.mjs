/* eslint-disable no-unused-expressions */
import Client from '../client.js'
import { defaultProjectId, defaultWorkspaceId, getProjectByName, getProjectById, appName, displayTimeEntry, parseTime } from '../utils.js'
import dayjs from 'dayjs'
import debugClient from 'debug'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'
dayjs.extend(utc)
dayjs.extend(timezone)

const debug = debugClient('toggl-cli-add');

export const command = 'add [startTime] [endTime] [description]'
export const desc = 'Create a time entry. Time must be parsable by dayjs, e.g. 4:50PM or \'12:00 AM\'.'

export const builder = {
  d: { alias: ['description'], describe: 'Time entry name', type: 'string:', demandOption: true},
  p: { alias: ['projectId', 'project'], describe: 'The case insensitive project name or project id.', type: 'string', demandOption: false },
  s: { alias: ['start', 'startTime'], describe: 'The start time for the task, e.g. 13:00 12:45AM.', type: 'string', demandOption: true },
  e: { alias: ['end', 'endTime'], describe: 'The end time for the task, e.g. 13:00 12:45AM.', type: 'string', demandOption: true }
}

export const handler = async function (argv) {
  const client = await Client()
  const params = {}

  params.workspace_id = +defaultWorkspaceId
  let project
  if (argv.projectId) {
    if (isNaN(argv.projectId)) {
      project = await getProjectByName(params.workspace_id, argv.projectId)
    } else {
      project = await getProjectById(params.workspace_id, argv.projectId)
    }
  } else {
    project = await getProjectById(params.workspace_id, defaultProjectId )
  }

  let startTime, endTime
  if (dayjs(argv.startTime).isValid()) {
    startTime = dayjs(argv.startTime)
  } else {
    // Parse the time and set it based upon the current time
    startTime = parseTime(argv.startTime)
  }

  if (dayjs(argv.endTime).isValid()) {
    endTime = dayjs(argv.endTime)
  } else {
    // Parse the time and set it based upon the current time
    endTime = parseTime(argv.endTime)
  }

  params.created_with = appName
  project ? params.project_id = +project.id : undefined
  startTime ? params.start = startTime.toISOString() : undefined
  endTime ? params.stop = endTime.toISOString() : undefined
  if (startTime || endTime) {
    const startTimeUnix = startTime.unix()
    const endTimeUnix = endTime.unix()
    let duration = endTimeUnix - startTimeUnix
    duration = endTime ? duration : startTimeUnix * -1
    params.duration = duration
  }
  argv.description ? params.description = argv.description : undefined
  debug(params)
  const timeEntry = await client.timeEntries.create(params)
  await displayTimeEntry(timeEntry)
}

