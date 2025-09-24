const {
  getRuleFromId,
  getRulesFromIdList,
  createScanDetails,
} = require('./DisplayScanInfo');
const ScansService = require('./ScansService');
const {getScanResults} = require('../repository/ScansRepo');

test('Displaying ScanDetails and Rule Info', async () => {
  const scanDetails = await createScanDetails('6529f5815fe3677422faf8ea');
  console.log(scanDetails);
});
