// ==UserScript==
// @name         ZwiftPower
// @namespace    http://tampermonkey.net/
// @version      base.1.1
// @description  Adds the riders category as of their signup to rides.
// @author       David Pugh
// @license      MIT
// @match        https://zwiftpower.com/*
// @grant        none
// ==/UserScript==

const categoryDivs = {
  5: ['Aplus', 'A+'],
  10: ['A', 'A'],
  20: ['B', 'B'],
  30: ['C', 'C'],
  40: ['D', 'D']
}

function waitForRows (callback, attempts) {
  const checkExist = setInterval(function () {
    if (jQuery('#table_event_results_final tbody tr a[href^=profile]').length) {
      clearInterval(checkExist)
      callback()
    } else if (attempts <= 0) {
      console.warn('Exhausted attempts, exiting')

      clearInterval(checkExist)
    }

    attempts -= 1
  }, 100)
}

(async function () {
  'use strict'

  if (!window.location.href.includes('/events.php')) {
    console.debug('Not on an events page, exiting early')

    return
  }

  console.log('ZwiftPower script starting...')

  const eventId = window.location.href.match(/zid=(\d+)/)[1]
  const res = await fetch(`cache3/results/${eventId}_signups.json`)
  const json = await res.json()

  waitForRows(function () {
    console.debug('Rows detected, hydrating data')

    if (jQuery('#pacing-category').length === 0) {
      console.debug('Adding category header')

      jQuery('#table_event_results_final thead tr')
        .first()
        .prepend('<th id="pacing-category" title="Based on user\'s category division at time of signup">Cat</th>')
    }

    json.data.forEach(data => {
      const [catClass, pacerCategory] = categoryDivs[data.div] ?? ['E', 'E']
      const zwiftUserRow = jQuery(`#table_event_results_final_wrapper tbody a[href$=${data.zwid}]`).closest('tr')

      if (zwiftUserRow.length === 0) {
        console.debug(`Could not find row for zwift user ${data.name} (${data.zwid})`)

        return
      }

      console.debug('Adding category for user', data.zwid, data.name, pacerCategory)

      zwiftUserRow
        .prepend(`
<td>
  <span class="label label-cat-${catClass} label-as-badge" style="font-size:14px;">
    ${pacerCategory}
  </span>
</td>
`)
    })
  }, 50)
})()

