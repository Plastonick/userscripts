// ==UserScript==
// @name         ZwiftPower
// @namespace    http://tampermonkey.net/
// @version      base.1.1
// @description  Adds guessed actual categories to riders on mixed-category rides. This is limited to guessing the category for a rider based on their FTP and weight, since the real category isn't obviously accessible via any easily accessed API methods I'm aware of. zMAP is also not available either, so some users are likely to be guessed at a category under their actual category.
// @author       David Pugh
// @license      MIT
// @match        https://zwiftpower.com/*
// @grant        none
// ==/UserScript==

const guessCategory = data => {
  const ftp = data.ftp
  const weight = data.weight[0]
  const relativeFtp = ftp / weight

  if (ftp > 300 && relativeFtp > 4.6) {
    return ['Aplus', 'A+']
  }

  if (ftp > 250 && relativeFtp > 4.2) {
    return ['A', 'A']
  }

  if (ftp > 200 && relativeFtp > 3.36) {
    return ['B', 'B']
  }

  if (ftp > 150 && relativeFtp > 2.626) {
    return ['C', 'C']
  }

  if (ftp) {
    return ['D', 'D']
  }

  return ['E', 'E']
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
  const res = await fetch(`cache3/results/${eventId}_view.json`)
  const json = await res.json()

  waitForRows(function () {
    console.debug('Rows detected, hydrating data')

    json.data.forEach(data => {
      const [catClass, guessedCat] = guessCategory(data)

      const zwiftUserRow = jQuery(`#table_event_results_final_wrapper tbody a[href$=${data.zwid}]`).closest('tr')

      if (zwiftUserRow.length === 0) {
        console.debug(`Could not find row for zwift user ${data.name} (${data.zwid})`)

        return
      }

      if (jQuery('#guessed-category').length === 0) {
        console.debug('Adding guessed category header')

        jQuery('#table_event_results_final thead tr')
          .first()
          .prepend('<th id="guessed-category" title="Guessed based on user\'s current FTP and weight">Cat</th>')
      }

      console.debug('Adding guessed category for user', data.zwid, data.name, guessedCat)

      zwiftUserRow
        .prepend(`
<td>
  <span class="label label-cat-${catClass} label-as-badge" style="font-size:14px;">
    ${guessedCat}
  </span>
</td>
`)
    })
  }, 50)
})()

