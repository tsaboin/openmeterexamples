'use client'

import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query'
import { experimental_createPersister } from '@tanstack/query-persist-client-core'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { MeterQueryRow, WindowSize } from '@openmeter/web'
import { OpenMeterProvider, useOpenMeter } from '@openmeter/web/react'
import {
  Chart as ChartJS,
  Colors,
  BarElement,
  TimeScale,
  TimeSeriesScale,
  LinearScale,
  Tooltip,
  PointElement,
} from 'chart.js'
import 'chartjs-adapter-luxon'
import { Bar } from 'react-chartjs-2'
import { useMemo, createContext, useContext } from 'react'

ChartJS.register(
  Colors,
  BarElement,
  LinearScale,
  TimeScale,
  TimeSeriesScale,
  Tooltip,
  PointElement
)

const queryClient = new QueryClient()

// Create context for subject
const SubjectContext = createContext<string | null>(null)

// Hook to access subject from anywhere in the app
export function useSubject() {
  return useContext(SubjectContext)
}

export function OpenMeterQuery() {
  return (
    <div className="flex flex-col space-y-12">
      <div className="flex-1">
        <OpenMeterQueryChart
          meterSlug={process.env.NEXT_PUBLIC_OPENMETER_METER_SLUG}
          windowSize="DAY"
        />
      </div>
      <OpenMeterQueryTable
        meterSlug={process.env.NEXT_PUBLIC_OPENMETER_METER_SLUG}
        windowSize="DAY"
      />
    </div>
  )
}

export function OpenMeterPortal({ children }: { children?: React.ReactNode }) {
  // get token from URL query string parameter "access_token"
  const token = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('access_token')
    : null

  // get subject from URL query string parameter "subject" or fallback to env var
  const subject =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('subject')
      : null

  const finalSubject =
    subject ?? process.env.NEXT_PUBLIC_OPENMETER_SUBJECT ?? ''

  return (
    <SubjectContext.Provider value={finalSubject}>
      <OpenMeterProvider
        url={process.env.NEXT_PUBLIC_OPENMETER_URL}
        token={token ?? undefined}
      >
        {children}
      </OpenMeterProvider>
    </SubjectContext.Provider>
  )
}

type Params = {
  meterSlug: string
  from?: string
  to?: string
  windowSize?: WindowSize
  windowTimeZone?: string
}

function useOpenMeterQuery(params: Params) {
  const openmeter = useOpenMeter()
  return useQuery({
    queryKey: ['openmeter', 'queryPortalMeter', params],
    queryFn: async () => {
      const { data } = await openmeter!.queryPortalMeter(params)
      return data
    },
    // disable query when openmeter client is not initialized (token is missing)
    enabled: !!openmeter,
  })
}

const columnHelper = createColumnHelper<MeterQueryRow>()
const columns = [
  columnHelper.accessor('windowStart', {
    id: 'windowStart',
    header: 'Window Start',
    cell: ({ getValue }) => (
      <time
        className="whitespace-nowrap text-gray-600 underline outline-none"
        dateTime={getValue()}
      >
        {new Date(getValue()).toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })}
      </time>
    ),
  }),
  columnHelper.accessor('windowEnd', {
    id: 'windowEnd',
    header: 'Window End',
    cell: ({ getValue }) => (
      <time
        className="whitespace-nowrap text-gray-600 underline outline-none"
        dateTime={getValue()}
      >
        {new Date(getValue()).toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })}
      </time>
    ),
  }),
  columnHelper.accessor('value', {
    id: 'value',
    header: 'Value',
    cell: ({ getValue }) =>
      getValue().toLocaleString(undefined, {
        maximumFractionDigits: 2,
      }),
  }),
]

export function OpenMeterQueryTable(params: Params) {
  // NOTE: error and loading states aren't handled here for brevity
  const { data } = useOpenMeterQuery(params)
  const table = useReactTable({
    columns,
    data: data?.data ?? [],
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <table className="w-full caption-bottom border-separate border-spacing-0 bg-slate-100">
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <th
                key={header.id}
                className="h-10 whitespace-nowrap bg-slate-200 px-2 text-left align-middle font-medium uppercase text-sm"
              >
                {flexRender(
                  header.column.columnDef.header,
                  header.getContext()
                )}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <td
                key={cell.id}
                className="whitespace-nowrap border-b border-zinc-200 p-2 align-middle"
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function OpenMeterQueryChart(params: Params) {
  // NOTE: error and loading states aren't handled here for brevity
  const { data } = useOpenMeterQuery(params)
  const chartData = useMemo(
    () => ({
      label: 'Values',
      datasets: [
        {
          data:
            data?.data.map(({ windowStart, value }) => ({
              x: windowStart,
              y: value,
            })) ?? [],
        },
      ],
    }),
    [data]
  )

  return (
    <div className="bg-slate-100 rounded h-96">
      <Bar
        options={{
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false,
          },
          scales: {
            x: {
              type: 'time',
              time: {
                unit: 'day',
              },
              adapters: {
                date: {
                  zone: 'UTC',
                },
              },
            },
            y: {
              min: 0,
            },
          },
        }}
        data={chartData}
      />
    </div>
  )
}
