'use client';

import { Checkbox, Table, Text } from '@mantine/core';
import { SLOT_LABELS, WEEKDAY_LABELS } from '@/lib/me';

const SLOTS = ['MORNING', 'AFTERNOON', 'EVENING'] as const;
/** Lundi → samedi, comme le formulaire d’origine. */
const WEEKDAYS = [1, 2, 3, 4, 5, 6];

type AvailabilityGridProps = {
  /** Clés `jour:créneau`, ex. `1:MORNING`. */
  selected: Set<string>;
  onToggle: (weekday: number, slot: string) => void;
};

/** Créneaux de disponibilité : une ligne par jour, une colonne par moment de la journée. */
export function AvailabilityGrid({ selected, onToggle }: AvailabilityGridProps) {
  return (
    <Table
      verticalSpacing={6}
      horizontalSpacing="xs"
      withRowBorders={false}
      style={{ tableLayout: 'fixed' }}
    >
      <Table.Thead>
        <Table.Tr>
          <Table.Th style={{ width: '34%' }}>
            <Text size="xs" c="dimmed" fw={600}>
              Jour
            </Text>
          </Table.Th>
          {SLOTS.map((slot) => (
            <Table.Th key={slot} ta="center">
              <Text size="xs" c="dimmed" fw={600} style={{ whiteSpace: 'nowrap' }}>
                {SLOT_LABELS[slot].charAt(0).toUpperCase() + SLOT_LABELS[slot].slice(1)}
              </Text>
            </Table.Th>
          ))}
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {WEEKDAYS.map((day) => (
          <Table.Tr key={day}>
            <Table.Th scope="row">
              <Text size="sm" fw={600}>
                {WEEKDAY_LABELS[day]}
              </Text>
            </Table.Th>
            {SLOTS.map((slot) => (
              <Table.Td key={slot}>
                <Checkbox
                  size="md"
                  styles={{ body: { justifyContent: 'center' } }}
                  aria-label={`${WEEKDAY_LABELS[day]} ${SLOT_LABELS[slot]}`}
                  checked={selected.has(`${day}:${slot}`)}
                  onChange={() => onToggle(day, slot)}
                />
              </Table.Td>
            ))}
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}
