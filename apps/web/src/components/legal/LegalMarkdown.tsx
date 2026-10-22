'use client';

import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';
import {
  Anchor,
  Divider,
  List,
  Table,
  Text,
  Title,
  Blockquote,
} from '@mantine/core';
import { tokens } from '@/theme/tokens';

const components: Components = {
  h1: ({ children }) => (
    <Title order={2} mt="md" mb="sm" style={{ fontFamily: 'var(--font-display)' }}>
      {children}
    </Title>
  ),
  h2: ({ children }) => (
    <Title order={3} mt="xl" mb="sm" style={{ fontFamily: 'var(--font-display)' }}>
      {children}
    </Title>
  ),
  h3: ({ children }) => (
    <Title order={4} mt="lg" mb="xs" style={{ fontFamily: 'var(--font-display)' }}>
      {children}
    </Title>
  ),
  p: ({ children }) => (
    <Text size="sm" mb="sm" style={{ lineHeight: 1.65 }}>
      {children}
    </Text>
  ),
  strong: ({ children }) => (
    <Text span fw={700} inherit>
      {children}
    </Text>
  ),
  em: ({ children }) => (
    <Text span fs="italic" inherit>
      {children}
    </Text>
  ),
  ul: ({ children }) => (
    <List size="sm" mb="md" spacing="xs" withPadding>
      {children}
    </List>
  ),
  ol: ({ children }) => (
    <List type="ordered" size="sm" mb="md" spacing="xs" withPadding>
      {children}
    </List>
  ),
  li: ({ children }) => <List.Item>{children}</List.Item>,
  a: ({ href, children }) => {
    const to = href ?? '#';
    const internal = to.startsWith('/');
    if (internal) {
      return (
        <Anchor component={Link} href={to} size="sm">
          {children}
        </Anchor>
      );
    }
    return (
      <Anchor href={to} size="sm" target="_blank" rel="noopener noreferrer">
        {children}
      </Anchor>
    );
  },
  hr: () => <Divider my="lg" color={tokens.color.border.subtle} />,
  blockquote: ({ children }) => (
    <Blockquote color="flash" my="md" p="md" radius="md">
      {children}
    </Blockquote>
  ),
  table: ({ children }) => (
    <Table.ScrollContainer minWidth={320} mb="md">
      <Table
        striped
        withTableBorder
        withColumnBorders
        highlightOnHover
        verticalSpacing="sm"
        horizontalSpacing="md"
      >
        {children}
      </Table>
    </Table.ScrollContainer>
  ),
  thead: ({ children }) => <Table.Thead>{children}</Table.Thead>,
  tbody: ({ children }) => <Table.Tbody>{children}</Table.Tbody>,
  tr: ({ children }) => <Table.Tr>{children}</Table.Tr>,
  th: ({ children }) => (
    <Table.Th>
      <Text span size="sm" fw={700}>
        {children}
      </Text>
    </Table.Th>
  ),
  td: ({ children }) => (
    <Table.Td>
      <Text span size="sm">
        {children}
      </Text>
    </Table.Td>
  ),
};

type LegalMarkdownProps = {
  content: string;
};

export function LegalMarkdown({ content }: LegalMarkdownProps) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  );
}
