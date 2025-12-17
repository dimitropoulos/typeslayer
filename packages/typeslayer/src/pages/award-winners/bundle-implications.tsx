import {
  Alert,
  AlertTitle,
  ListSubheader,
  Stack,
  Typography,
} from "@mui/material";
import { useCallback } from "react";
import { CenterLoader } from "../../components/center-loader";
import { InlineCode } from "../../components/inline-code";
import { NoData } from "../../components/no-data";
import { OpenablePath } from "../../components/openable-path";
import { useAnalyzeTrace } from "../../hooks/tauri-hooks";
import { AwardNavItem } from "./award-nav-item";
import { AWARD_SELECTOR_COLUMN_WIDTH, type AwardId, awards } from "./awards";
import { TitleSubtitle } from "./title-subtitle";

const DuplicatePackages = () => {
  const { data: analyzeTrace, isLoading } = useAnalyzeTrace();
  const duplicatePackages = analyzeTrace?.duplicatePackages ?? [];
  const Icon = awards.bundle_duplicatePackages.icon;

  const noneFound = (
    <Alert severity="success" sx={{ mx: 1 }}>
      <AlertTitle>No duplicate packages found.</AlertTitle>
      That's a good thing!
    </Alert>
  );

  const hasData = analyzeTrace !== undefined;
  const hasItems = duplicatePackages.length > 0;

  const items = (
    <Stack gap={3}>
      {duplicatePackages.map(({ instances, name }) => (
        <Stack key={name} sx={{ ml: 3, mr: 6 }}>
          <Typography
            variant="h5"
            sx={{
              pb: 1,
              borderBottom: 1,
              borderBottomColor: "primary.main",
            }}
          >
            {name}
          </Typography>

          <Stack sx={{}}>
            {instances.map(({ path, version }) => (
              <Stack
                key={path}
                sx={{
                  width: "100%",
                  borderLeft: 5,
                  borderColor: "primary.main",
                  pl: 2,
                  py: 1,

                  "&:hover": {
                    backgroundColor: "action.hover",
                  },
                }}
              >
                <Typography color="secondary">v{version}</Typography>

                <OpenablePath absolutePath={path} />
              </Stack>
            ))}
          </Stack>
        </Stack>
      ))}
    </Stack>
  );

  return (
    <Stack
      sx={{
        p: 1,
        pt: 2,

        gap: 2,
        ...(hasItems
          ? {}
          : { width: AWARD_SELECTOR_COLUMN_WIDTH, flexShrink: 0 }),
      }}
    >
      <TitleSubtitle
        title="Duplicate Packages"
        subtitle={
          <Typography>
            Packages that are duplicated in the bundle. TypeScript doesn't keep
            track of where these were included from, but at least now you know
            they're there. What you should do next is run something lke{" "}
            <InlineCode>pnpm why</InlineCode> (or just look at your lockfile) to
            see why these packages are being included.
          </Typography>
        }
        icon={<Icon fontSize="large" />}
      />

      {isLoading ? (
        <CenterLoader />
      ) : hasData ? (
        hasItems ? (
          items
        ) : (
          noneFound
        )
      ) : (
        <NoData />
      )}
    </Stack>
  );
};

const bundleImplications = ["bundle_duplicatePackages"] satisfies AwardId[];
type BundleImplicationsAwardId = (typeof bundleImplications)[number];

const useBundleImplicationsValue = () => {
  const { data: analyzeTrace } = useAnalyzeTrace();

  return useCallback(
    (awardId: BundleImplicationsAwardId): number => {
      switch (awardId) {
        case "bundle_duplicatePackages": {
          const duplicatePackages = analyzeTrace?.duplicatePackages ?? [];
          return duplicatePackages.length;
        }
        default:
          awardId satisfies never;
          throw new Error(`Unknown award: ${awardId}`);
      }
    },
    [analyzeTrace],
  );
};

export const BundleImplicationsNavItems = () => {
  const getValue = useBundleImplicationsValue();

  return (
    <>
      <ListSubheader>Bundle Implications</ListSubheader>

      {bundleImplications.map(awardId => (
        <AwardNavItem
          key={awardId}
          awardId={awardId}
          value={getValue(awardId)}
        />
      ))}
    </>
  );
};

export const BundleImplicationsAward = ({
  awardId,
}: {
  awardId: BundleImplicationsAwardId;
}) => {
  if (awardId !== "bundle_duplicatePackages") {
    throw new Error(`Unknown award: ${awardId}`);
  }

  return <DuplicatePackages />;
};
