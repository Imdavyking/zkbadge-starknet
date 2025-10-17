import { type Abi } from "@starknet-react/core";
const erc20Abi = [
  {
    type: "impl",
    name: "IERC20Impl",
    interface_name: "zkbadge::erc20::IERC20",
  },
  {
    type: "struct",
    name: "core::byte_array::ByteArray",
    members: [
      {
        name: "data",
        type: "core::array::Array::<core::bytes_31::bytes31>",
      },
      { name: "pending_word", type: "core::felt252" },
      { name: "pending_word_len", type: "core::integer::u32" },
    ],
  },
  {
    type: "struct",
    name: "core::integer::u256",
    members: [
      { name: "low", type: "core::integer::u128" },
      { name: "high", type: "core::integer::u128" },
    ],
  },
  {
    type: "enum",
    name: "core::bool",
    variants: [
      { name: "False", type: "()" },
      { name: "True", type: "()" },
    ],
  },
  {
    type: "interface",
    name: "zkbadge::erc20::IERC20",
    items: [
      {
        type: "function",
        name: "name",
        inputs: [],
        outputs: [{ type: "core::byte_array::ByteArray" }],
        state_mutability: "view",
      },
      {
        type: "function",
        name: "symbol",
        inputs: [],
        outputs: [{ type: "core::byte_array::ByteArray" }],
        state_mutability: "view",
      },
      {
        type: "function",
        name: "decimals",
        inputs: [],
        outputs: [{ type: "core::integer::u8" }],
        state_mutability: "view",
      },
      {
        type: "function",
        name: "total_supply",
        inputs: [],
        outputs: [{ type: "core::integer::u256" }],
        state_mutability: "view",
      },
      {
        type: "function",
        name: "totalSupply",
        inputs: [],
        outputs: [{ type: "core::integer::u256" }],
        state_mutability: "view",
      },
      {
        type: "function",
        name: "balance_of",
        inputs: [
          {
            name: "account",
            type: "core::starknet::contract_address::ContractAddress",
          },
        ],
        outputs: [{ type: "core::integer::u256" }],
        state_mutability: "view",
      },
      {
        type: "function",
        name: "balanceOf",
        inputs: [
          {
            name: "account",
            type: "core::starknet::contract_address::ContractAddress",
          },
        ],
        outputs: [{ type: "core::integer::u256" }],
        state_mutability: "view",
      },
      {
        type: "function",
        name: "allowance",
        inputs: [
          {
            name: "owner",
            type: "core::starknet::contract_address::ContractAddress",
          },
          {
            name: "spender",
            type: "core::starknet::contract_address::ContractAddress",
          },
        ],
        outputs: [{ type: "core::integer::u256" }],
        state_mutability: "view",
      },
      {
        type: "function",
        name: "transfer",
        inputs: [
          {
            name: "recipient",
            type: "core::starknet::contract_address::ContractAddress",
          },
          { name: "amount", type: "core::integer::u256" },
        ],
        outputs: [{ type: "core::bool" }],
        state_mutability: "external",
      },
      {
        type: "function",
        name: "transfer_from",
        inputs: [
          {
            name: "sender",
            type: "core::starknet::contract_address::ContractAddress",
          },
          {
            name: "recipient",
            type: "core::starknet::contract_address::ContractAddress",
          },
          { name: "amount", type: "core::integer::u256" },
        ],
        outputs: [{ type: "core::bool" }],
        state_mutability: "external",
      },
      {
        type: "function",
        name: "transferFrom",
        inputs: [
          {
            name: "sender",
            type: "core::starknet::contract_address::ContractAddress",
          },
          {
            name: "recipient",
            type: "core::starknet::contract_address::ContractAddress",
          },
          { name: "amount", type: "core::integer::u256" },
        ],
        outputs: [{ type: "core::bool" }],
        state_mutability: "external",
      },
      {
        type: "function",
        name: "approve",
        inputs: [
          {
            name: "spender",
            type: "core::starknet::contract_address::ContractAddress",
          },
          { name: "amount", type: "core::integer::u256" },
        ],
        outputs: [{ type: "core::bool" }],
        state_mutability: "external",
      },
      {
        type: "function",
        name: "increase_allowance",
        inputs: [
          {
            name: "spender",
            type: "core::starknet::contract_address::ContractAddress",
          },
          { name: "added_value", type: "core::integer::u256" },
        ],
        outputs: [],
        state_mutability: "external",
      },
      {
        type: "function",
        name: "increaseAllowance",
        inputs: [
          {
            name: "spender",
            type: "core::starknet::contract_address::ContractAddress",
          },
          { name: "added_value", type: "core::integer::u256" },
        ],
        outputs: [],
        state_mutability: "external",
      },
      {
        type: "function",
        name: "decrease_allowance",
        inputs: [
          {
            name: "spender",
            type: "core::starknet::contract_address::ContractAddress",
          },
          { name: "subtracted_value", type: "core::integer::u256" },
        ],
        outputs: [],
        state_mutability: "external",
      },
      {
        type: "function",
        name: "decreaseAllowance",
        inputs: [
          {
            name: "spender",
            type: "core::starknet::contract_address::ContractAddress",
          },
          { name: "subtracted_value", type: "core::integer::u256" },
        ],
        outputs: [],
        state_mutability: "external",
      },
      {
        type: "function",
        name: "mint",
        inputs: [
          {
            name: "recipient",
            type: "core::starknet::contract_address::ContractAddress",
          },
          { name: "amount", type: "core::integer::u256" },
        ],
        outputs: [{ type: "core::bool" }],
        state_mutability: "external",
      },
      {
        type: "function",
        name: "owner",
        inputs: [],
        outputs: [
          { type: "core::starknet::contract_address::ContractAddress" },
        ],
        state_mutability: "view",
      },
    ],
  },
  { type: "constructor", name: "constructor", inputs: [] },
  {
    type: "event",
    name: "zkbadge::erc20::ERC20::Transfer",
    kind: "struct",
    members: [
      {
        name: "from",
        type: "core::starknet::contract_address::ContractAddress",
        kind: "data",
      },
      {
        name: "to",
        type: "core::starknet::contract_address::ContractAddress",
        kind: "data",
      },
      { name: "value", type: "core::integer::u256", kind: "data" },
    ],
  },
  {
    type: "event",
    name: "zkbadge::erc20::ERC20::Approval",
    kind: "struct",
    members: [
      {
        name: "owner",
        type: "core::starknet::contract_address::ContractAddress",
        kind: "data",
      },
      {
        name: "spender",
        type: "core::starknet::contract_address::ContractAddress",
        kind: "data",
      },
      { name: "value", type: "core::integer::u256", kind: "data" },
    ],
  },
  {
    type: "event",
    name: "zkbadge::erc20::ERC20::Event",
    kind: "enum",
    variants: [
      {
        name: "Transfer",
        type: "zkbadge::erc20::ERC20::Transfer",
        kind: "nested",
      },
      {
        name: "Approval",
        type: "zkbadge::erc20::ERC20::Approval",
        kind: "nested",
      },
    ],
  },
] as const satisfies Abi;

export default erc20Abi;
