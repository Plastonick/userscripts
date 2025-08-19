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
  40: ['D', 'D'],
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
  const categoryMap = {}

  json.data.forEach(data => {
    const [catClass, pacerCategory] = categoryDivs[data.div] ?? ['E', 'E']

    categoryMap[data.zwid] = {
      catClass,
      pacerCategory,
      name: data.name
    }
  })

  const getPaceNode = (zwid) => {
    let nodeLabel
    if (categoryMap.hasOwnProperty(zwid)) {
      const { catClass, pacerCategory, name } = categoryMap[zwid]
      console.debug('Building category label for user', zwid, name, pacerCategory)

      nodeLabel = `<span class="label label-cat-${catClass} label-as-badge" style="font-size:14px;">${pacerCategory}</span>`
    } else {
      console.debug(`Could not find category for Zwift user ID`, zwid)

      nodeLabel = `<span class="label label-default label-as-badge" style="font-size: 14px" title="Unknown category, user likely late joined">?</span>`
    }

    return `<td class="pace-category">${nodeLabel}</td>`
  }

  waitForRows(function () {
    console.debug('Rows detected, hydrating signup data')

    if (jQuery('#pacing-category').length === 0) {
      jQuery('#table_event_results_final thead tr')

      console.debug('Adding category header')

      jQuery('#table_event_results_final thead tr')
        .first()
        .prepend('<th id="pacing-category" title="Based on user\'s category division at time of signup">Cat</th>')

      const defaultCategoryNode = `
<td class="pace-category">
    <span 
        class="label label-default label-as-badge" 
        style="font-size: 14px" 
        title="Unknown category, user likely late joined"
    >?</span>
</td>`

      const datatable = jQuery('#table_event_results_final').DataTable()
      const addCategoryCells = () => {
        datatable.rows().every(function() {
          const row = jQuery(this.node())

          // if we've already got the pace category cell, move along
          if (row.find('td.pace-category').length !== 0) {
            return
          }

          const zwidLink = row.find('.athlete_col a').attr('href')
          if (zwidLink === undefined) {
            return
          }

          const zwid = zwidLink.match(/\d+$/)[0]

          row.prepend(getPaceNode(zwid))
        })
      }

      addCategoryCells()
      datatable.on('draw', addCategoryCells)
    }
  }, 50)
})()

