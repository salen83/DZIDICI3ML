/**
 * Ucitava SVE redove iz Supabase tabele.
 * Supabase ogranicava jedan request na 1000 redova,
 * zato podatke ucitavamo u paketima.
 */
export async function fetchAllSupabase(
  supabase,
  table,
  select = "*",
  options = {}
) {
  const {
    pageSize = 1000,
    orderBy = null,
    ascending = true,
    filters = [],
  } = options;

  const allRows = [];
  let from = 0;

  while (true) {
    let query = supabase
      .from(table)
      .select(select)
      .range(from, from + pageSize - 1);

    // Primeni filtere ako postoje
    for (const filter of filters) {
      if (!filter || !filter.type) continue;

      switch (filter.type) {
        case "eq":
          query = query.eq(filter.column, filter.value);
          break;

        case "neq":
          query = query.neq(filter.column, filter.value);
          break;

        case "in":
          query = query.in(filter.column, filter.values);
          break;

        case "is":
          query = query.is(filter.column, filter.value);
          break;

        case "not":
          query = query.not(
            filter.column,
            filter.operator || "is",
            filter.value
          );
          break;

        default:
          console.warn(
            `[fetchAllSupabase] Nepoznat filter: ${filter.type}`
          );
      }
    }

    if (orderBy) {
      query = query.order(orderBy, { ascending });
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      break;
    }

    allRows.push(...data);

    console.log(
      `[Supabase] ${table}: ucitano ${allRows.length} redova`
    );

    // Ako smo dobili manje od pageSize,
    // stigli smo do kraja.
    if (data.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return allRows;
}
