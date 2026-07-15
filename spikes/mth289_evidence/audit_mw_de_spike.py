#!/usr/bin/env python3
"""
Independent audit for mw_de_spike_v1.js.

Uses only Python's standard library. It does not import or execute the
JavaScript implementation, so it provides an independent formula oracle
for the two MTH 289 spike families.
"""

from __future__ import annotations

from dataclasses import dataclass, replace
from fractions import Fraction
from math import exp, isfinite
from typing import Iterable


AUDIT_POINTS = (-1.25, -0.7, 0.31, 0.83, 1.4)

SEPARABLE_N_POOL = (0, 1, 2, 3)
SEPARABLE_MULTIPLIER_POOL = (-3, -2, -1, 1, 2, 3)
Y0_POOL = (-5, -4, -3, -2, -1, 1, 2, 3, 4, 5)

LINEAR_A_POOL = (-4, -3, -2, -1, 1, 2, 3, 4)
LINEAR_EQUILIBRIUM_POOL = (-4, -3, -2, -1, 0, 1, 2, 3, 4)
LINEAR_TRANSIENT_POOL = (-4, -3, -2, -1, 1, 2, 3, 4)


@dataclass(frozen=True)
class SeparableQuestion:
    a: Fraction
    n: int
    y0: Fraction


@dataclass(frozen=True)
class ExpPowerSolution:
    amplitude: Fraction
    exponent_coefficient: Fraction
    exponent_power: int


@dataclass(frozen=True)
class LinearQuestion:
    a: Fraction
    b: Fraction
    y0: Fraction


@dataclass(frozen=True)
class EquilibriumExpSolution:
    equilibrium: Fraction
    transient: Fraction
    rate: Fraction


def nearly_equal(
    left: float,
    right: float,
    abs_tolerance: float = 1e-10,
    rel_tolerance: float = 1e-9,
) -> bool:
    if not isfinite(left) or not isfinite(right):
        return False

    difference = abs(left - right)
    scale = max(1.0, abs(left), abs(right))
    return difference <= abs_tolerance + rel_tolerance * scale


def solve_separable(question: SeparableQuestion) -> ExpPowerSolution:
    power = question.n + 1
    return ExpPowerSolution(
        amplitude=question.y0,
        exponent_coefficient=question.a / power,
        exponent_power=power,
    )


def validate_separable(
    question: SeparableQuestion,
    candidate: ExpPowerSolution,
) -> bool:
    return (
        candidate.exponent_power == question.n + 1
        and candidate.exponent_coefficient * candidate.exponent_power
        == question.a
        and candidate.amplitude == question.y0
    )


def evaluate_separable(
    solution: ExpPowerSolution,
    x_value: float,
) -> tuple[float, float]:
    amplitude = float(solution.amplitude)
    coefficient = float(solution.exponent_coefficient)
    power = solution.exponent_power

    y_value = amplitude * exp(coefficient * (x_value**power))
    derivative = (
        y_value
        * coefficient
        * power
        * (x_value ** (power - 1))
    )
    return y_value, derivative


def numeric_audit_separable(
    question: SeparableQuestion,
    solution: ExpPowerSolution,
) -> bool:
    for x_value in AUDIT_POINTS:
        y_value, derivative = evaluate_separable(solution, x_value)
        rhs = float(question.a) * (x_value**question.n) * y_value

        if not nearly_equal(derivative, rhs):
            return False

    y_at_zero, _ = evaluate_separable(solution, 0.0)
    return nearly_equal(y_at_zero, float(question.y0))


def solve_linear(question: LinearQuestion) -> EquilibriumExpSolution:
    equilibrium = question.b / question.a
    transient = question.y0 - equilibrium

    return EquilibriumExpSolution(
        equilibrium=equilibrium,
        transient=transient,
        rate=-question.a,
    )


def validate_linear(
    question: LinearQuestion,
    candidate: EquilibriumExpSolution,
) -> bool:
    return (
        candidate.rate == -question.a
        and question.a * candidate.equilibrium == question.b
        and candidate.equilibrium + candidate.transient == question.y0
    )


def evaluate_linear(
    solution: EquilibriumExpSolution,
    x_value: float,
) -> tuple[float, float]:
    equilibrium = float(solution.equilibrium)
    transient = float(solution.transient)
    rate = float(solution.rate)

    exponential = exp(rate * x_value)
    y_value = equilibrium + transient * exponential
    derivative = transient * rate * exponential
    return y_value, derivative


def numeric_audit_linear(
    question: LinearQuestion,
    solution: EquilibriumExpSolution,
) -> bool:
    for x_value in AUDIT_POINTS:
        y_value, derivative = evaluate_linear(solution, x_value)
        lhs = derivative + float(question.a) * y_value
        rhs = float(question.b)

        if not nearly_equal(lhs, rhs):
            return False

    y_at_zero, _ = evaluate_linear(solution, 0.0)
    return nearly_equal(y_at_zero, float(question.y0))


def separable_mutations(
    solution: ExpPowerSolution,
) -> Iterable[ExpPowerSolution]:
    yield replace(
        solution,
        amplitude=solution.amplitude + 1,
    )
    yield replace(
        solution,
        exponent_coefficient=solution.exponent_coefficient + 1,
    )
    yield replace(
        solution,
        exponent_power=solution.exponent_power + 1,
    )


def linear_mutations(
    solution: EquilibriumExpSolution,
) -> Iterable[EquilibriumExpSolution]:
    yield replace(
        solution,
        equilibrium=solution.equilibrium + 1,
    )
    yield replace(
        solution,
        transient=solution.transient + 1,
    )
    yield replace(
        solution,
        rate=solution.rate + 1,
    )


def run_audit() -> dict[str, int]:
    counts = {
        "separable_models": 0,
        "separable_correct_accepted": 0,
        "separable_numeric_passed": 0,
        "separable_mutations_rejected": 0,
        "linear_models": 0,
        "linear_correct_accepted": 0,
        "linear_numeric_passed": 0,
        "linear_mutations_rejected": 0,
    }

    for n_value in SEPARABLE_N_POOL:
        for multiplier in SEPARABLE_MULTIPLIER_POOL:
            coefficient = Fraction(multiplier * (n_value + 1))

            for y0_value in Y0_POOL:
                question = SeparableQuestion(
                    a=coefficient,
                    n=n_value,
                    y0=Fraction(y0_value),
                )
                solution = solve_separable(question)
                counts["separable_models"] += 1

                if validate_separable(question, solution):
                    counts["separable_correct_accepted"] += 1

                if numeric_audit_separable(question, solution):
                    counts["separable_numeric_passed"] += 1

                for candidate in separable_mutations(solution):
                    if not validate_separable(question, candidate):
                        counts["separable_mutations_rejected"] += 1

    for a_value in LINEAR_A_POOL:
        for equilibrium_value in LINEAR_EQUILIBRIUM_POOL:
            for transient_value in LINEAR_TRANSIENT_POOL:
                a = Fraction(a_value)
                equilibrium = Fraction(equilibrium_value)
                transient = Fraction(transient_value)
                b = a * equilibrium
                y0 = equilibrium + transient

                question = LinearQuestion(a=a, b=b, y0=y0)
                solution = solve_linear(question)
                counts["linear_models"] += 1

                if validate_linear(question, solution):
                    counts["linear_correct_accepted"] += 1

                if numeric_audit_linear(question, solution):
                    counts["linear_numeric_passed"] += 1

                for candidate in linear_mutations(solution):
                    if not validate_linear(question, candidate):
                        counts["linear_mutations_rejected"] += 1

    expected = {
        "separable_correct_accepted": counts["separable_models"],
        "separable_numeric_passed": counts["separable_models"],
        "separable_mutations_rejected": counts["separable_models"] * 3,
        "linear_correct_accepted": counts["linear_models"],
        "linear_numeric_passed": counts["linear_models"],
        "linear_mutations_rejected": counts["linear_models"] * 3,
    }

    failures = [
        key
        for key, expected_value in expected.items()
        if counts[key] != expected_value
    ]

    if failures:
        details = ", ".join(
            f"{key}: got {counts[key]}, expected {expected[key]}"
            for key in failures
        )
        raise AssertionError(details)

    return counts


def main() -> None:
    counts = run_audit()

    print("MTH 289 independent audit: PASS")
    for key, value in counts.items():
        print(f"{key}: {value}")


if __name__ == "__main__":
    main()
