import ledger from './ledger';

/**
 * Fetch all transaction pages from the API.
 * Uses cursor.has_more (boolean) to paginate.
 * Returns a flat array of all transactions.
 */
export default function fetchAllTransactions() {
  const all = [];

  function fetchPage(query) {
    return ledger()
      .getTransactions(query)
      .then(data => {
        const cursor = data && data.cursor;
        if (!cursor) return all;

        const page = cursor.data || [];
        all.push(...page);

        if (cursor.has_more && page.length > 0) {
          const lastTxid = page[page.length - 1].txid;
          return fetchPage({ after: lastTxid });
        }

        return all;
      });
  }

  return fetchPage({});
}
