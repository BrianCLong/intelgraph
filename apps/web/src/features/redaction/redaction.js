import $ from 'jquery';
import {
  scan,
  redactProposals,
  applyRedactions,
} from '../../../../packages/sdk/privacy-js/index.js';

$(function () {
  $('#scan').on('click', async () => {
    const text = $('#input').val();
    const result = await scan(text);
    $('#results').text(JSON.stringify(result, null, 2));
  });

  $('#apply').on('click', async () => {
    const text = $('#input').val();
    const proposals = (await redactProposals(text)).proposals;
    const applied = await applyRedactions(text, proposals, 'admin', 'ui');
    $('#results').text(applied.redacted);
  });
});
